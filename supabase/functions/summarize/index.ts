// CiteCraft document summarizer (Supabase Edge Function, Deno).
//
// POST {
//   fileName, mimeType, sizeBytes,
//   source: { kind: "pdf" | "image", data: base64, mediaType } | { kind: "text", text },
//   options: { length: "brief" | "standard" | "detailed", focus: Focus, language: string }
// }
// Responds with newline-delimited JSON, streamed as the summary is written:
//   {"type":"text","text":"..."}  (many)
//   {"type":"done","id":"<saved summary id>"} | {"type":"error","message":"..."}
//
// PDFs and images go to Claude directly; other formats (Word, PowerPoint, Excel,
// text…) are converted to text in the browser first.
//
// Secrets: ANTHROPIC_API_KEY (required), SUMMARY_MODEL (optional),
//          AI_DAILY_SUMMARY_LIMIT (optional, default 25).

import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const MODEL = Deno.env.get('SUMMARY_MODEL') ?? 'claude-opus-5-5';
const DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_SUMMARY_LIMIT') ?? '25');
const MAX_BASE64_CHARS = 14_000_000; // ≈ 10 MB file
const MAX_TEXT_CHARS = 600_000; // ≈ 150k tokens
const FALLBACK_MODELS = new Set([
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-fable-5-2',
  'claude-fable-5-1',
  'claude-sonnet-5-5',
]);
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const LENGTHS = {
  brief: 'Keep it short: a 2–3 sentence TL;DR and at most 5 bullet points (about 150 words in total).',
  standard: 'Aim for about 300–450 words.',
  detailed: 'Be thorough: about 700–1000 words, covering each major section of the document.',
} as const;

const FOCUSES: Record<string, string> = {
  general: 'Give a balanced overview: purpose, main content, key points and conclusions.',
  key_findings: 'Concentrate on the key findings, results, numbers and conclusions.',
  methods: 'Concentrate on the methodology: data, approach, experimental setup, tools and limitations.',
  literature: 'Write it as a literature-review note: research question, method, findings, contribution and limitations, plus how it could be cited.',
  action_items: 'Concentrate on decisions, action items, deadlines and owners.',
  simple: 'Explain it in plain language for a non-specialist, avoiding jargon.',
  slides: 'Turn it into slide-ready bullet points grouped under short slide titles.',
};

function buildInstructions(fileName: string, length: keyof typeof LENGTHS, focus: string, language: string) {
  return `Summarize the attached document "${fileName}".

${FOCUSES[focus] ?? FOCUSES.general}
${LENGTHS[length]}

Format in Markdown:
- Start with "## TL;DR" and a 1–3 sentence summary.
- Then "## Key points" as a bullet list.
- Add other short "## " sections only if useful for this kind of document (for example Methods, Results, Limitations, Action items).
- Use **bold** for important terms and numbers. No tables, no images, no HTML.

Write the summary in ${language || 'English'}. Base it only on the document; if part of it is unreadable or missing, say so briefly instead of guessing.`;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'The summarizer is not configured yet.' }, 503);

  const authHeader = req.headers.get('Authorization') ?? '';
  const anonKey = req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const db = createClient(Deno.env.get('SUPABASE_URL')!, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await db.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
  if (authError || !auth.user) return json({ error: 'Please sign in again.' }, 401);
  const userId = auth.user.id;

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'The file is too large or the request is invalid.' }, 400);
  }

  const fileName = String(body?.fileName ?? 'document').slice(0, 255) || 'document';
  const mimeType = String(body?.mimeType ?? 'application/octet-stream').slice(0, 120);
  const sizeBytes = Math.max(0, Number(body?.sizeBytes) || 0);
  const length: keyof typeof LENGTHS = ['brief', 'standard', 'detailed'].includes(body?.options?.length)
    ? body.options.length
    : 'standard';
  const focus = Object.hasOwn(FOCUSES, body?.options?.focus) ? body.options.focus : 'general';
  const language = String(body?.options?.language ?? 'English').replace(/[^\p{L} ()-]/gu, '').slice(0, 40);

  // Build the document content block.
  const source = body?.source;
  // deno-lint-ignore no-explicit-any
  let documentBlock: any;
  if (source?.kind === 'pdf' && typeof source.data === 'string') {
    if (source.data.length > MAX_BASE64_CHARS) return json({ error: 'PDFs must be 10 MB or smaller.' }, 413);
    documentBlock = {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: source.data },
      title: fileName,
    };
  } else if (source?.kind === 'image' && typeof source.data === 'string') {
    if (!IMAGE_TYPES.includes(source.mediaType)) return json({ error: 'Unsupported image type.' }, 400);
    if (source.data.length > MAX_BASE64_CHARS) return json({ error: 'Images must be 10 MB or smaller.' }, 413);
    documentBlock = { type: 'image', source: { type: 'base64', media_type: source.mediaType, data: source.data } };
  } else if (source?.kind === 'text' && typeof source.text === 'string') {
    const text = source.text.trim();
    if (!text) return json({ error: 'No readable text was found in this file.' }, 400);
    if (text.length > MAX_TEXT_CHARS) {
      return json(
        {
          error: `This document is too long to summarize in one go (about ${Math.round(text.length / 6).toLocaleString()} words; the limit is about 100,000). Try splitting it into parts.`,
        },
        413,
      );
    }
    documentBlock = {
      type: 'document',
      source: { type: 'text', media_type: 'text/plain', data: text },
      title: fileName,
    };
  } else {
    return json({ error: 'Unsupported file.' }, 400);
  }

  // Daily limit.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await db
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', 'summary')
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({ error: `You've reached today's limit of ${DAILY_LIMIT} summaries. Try again tomorrow.` }, 429);
  }
  await db.from('ai_usage').insert({ user_id: userId, kind: 'summary' });

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      try {
        const messageStream = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 16000,
          output_config: { effort: 'medium' },
          ...(FALLBACK_MODELS.has(MODEL)
            ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
            : {}),
          system:
            'You are an expert research assistant who writes accurate, well-structured summaries of academic and professional documents for CiteCraft users.',
          messages: [
            {
              role: 'user',
              content: [documentBlock, { type: 'text', text: buildInstructions(fileName, length, focus, language) }],
            },
          ],
        });

        for await (const event of messageStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send({ type: 'text', text: event.delta.text });
          }
        }

        const final = await messageStream.finalMessage();
        if (final.stop_reason === 'refusal') {
          send({ type: 'error', message: "This document can't be summarized." });
          controller.close();
          return;
        }
        const summary = final.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
          .map(b => b.text)
          .join('')
          .trim();

        const { data: saved, error } = await db
          .from('document_summaries')
          .insert({ user_id: userId, file_name: fileName, mime_type: mimeType, size_bytes: sizeBytes, length, focus, summary })
          .select('id')
          .single();
        if (error) console.error('could not save summary', error);
        send({ type: 'done', id: saved?.id ?? null, truncated: final.stop_reason === 'max_tokens' });
      } catch (error) {
        console.error('summarize error', error);
        let message = 'Something went wrong while summarizing. Please try again.';
        if (error instanceof Anthropic.RateLimitError) message = 'The summarizer is busy right now. Please try again in a moment.';
        else if (error instanceof Anthropic.BadRequestError) message = 'This file could not be read. It may be corrupted, encrypted or too large.';
        else if (error instanceof Anthropic.AuthenticationError) message = 'The summarizer is not configured correctly.';
        send({ type: 'error', message });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { ...CORS, 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
});
