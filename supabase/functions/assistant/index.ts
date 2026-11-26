// CiteCraft AI assistant (Supabase Edge Function, Deno).
//
// POST { messages: [{ role: "user" | "assistant", content: string }] }
//  -> { reply: string, actions: Action[] }
//
// The function acts as the signed-in user: every database call goes through a
// Supabase client carrying the user's own access token, so Row Level Security
// limits the assistant to that user's data.
//
// Secrets: ANTHROPIC_API_KEY (required), ASSISTANT_MODEL (optional),
//          AI_DAILY_CHAT_LIMIT (optional, default 60).

import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0';
import { betaTool } from 'npm:@anthropic-ai/sdk@1.8.0/helpers/beta/json-schema';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

const MODEL = Deno.env.get('ASSISTANT_MODEL') ?? 'claude-opus-5-5';
const DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_CHAT_LIMIT') ?? '60');
const MAX_TURNS = 20;
const MAX_MESSAGE_CHARS = 8000;
// Models that support server-side refusal fallbacks ("default" routing).
const FALLBACK_MODELS = new Set([
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-fable-5-2',
  'claude-fable-5-1',
  'claude-sonnet-5-5',
]);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Action =
  | { type: 'publication_added'; id: string; title: string }
  | { type: 'ticket_created'; id: string; ticketNumber: number; subject: string };

// ---------------------------------------------------------------- prompt

const SYSTEM_PROMPT = `You are the CiteCraft assistant, built into CiteCraft — a web app where faculty and researchers manage, analyse and showcase their academic publications.

You help the signed-in user in two ways:
1. Explain how to use CiteCraft (answer from the guide below; never invent features).
2. Act on their behalf with your tools: look up their publications and metrics, fetch details for a DOI, add publications, and raise support tickets.

# Rules for actions
- Before calling add_publication or raise_support_ticket, show the user exactly what you will save (a short list of the fields) and ask them to confirm. Only call the tool after their latest message clearly says yes. If they ask for changes, update the draft and confirm again.
- When the user gives a DOI, call lookup_doi first and use those details — never guess titles, authors, years, venues or citation counts.
- If lookup_doi fails, tell the user and offer to add the publication from details they type.
- Only add one publication per confirmation unless the user explicitly confirms a list.
- You can only see and change this user's own data. You cannot delete or edit existing publications; point the user to the Dashboard for that.

# Style
- Be friendly, clear and brief. Use short paragraphs and bullet lists; use **bold** for key UI names. No headings unless the answer is long.
- Give step-by-step instructions as a numbered list.
- If something is outside CiteCraft (general research advice is fine), keep it short.

# CiteCraft guide
- **Dashboard** (/dashboard): stat cards (publications, citations, h-index, i10-index); tabs for Publications, Summary, Documents and Profile.
  - **Add Publication**: opens a form. Paste a DOI into **Fill in from a DOI** and click **Fetch** to auto-fill title, authors, venue, year and citations.
  - **Import**: bulk add from many DOIs (one per line) or a BibTeX (.bib) file from Google Scholar, Zotero or Mendeley. Shows a preview and flags duplicates already in the library.
  - **Export**: CSV, BibTeX, a reference list in APA, MLA or IEEE, or **Printable CV / PDF**.
  - Each publication card has edit, delete, **Cite** (copy APA/MLA/IEEE) and copy-link buttons; **Show More** reveals abstract and tags.
  - Search, filter by type and sort by year, citations or title above the list.
- **Summary** (/summary): charts and research impact — h-index, i10-index, average citations, citations by year, venues and collaborators.
- **Summarize** (/summarize): upload any document (PDF, Word, PowerPoint, Excel, text, images…) and get an AI summary; choose length and focus; past summaries are saved.
- **Documents** tab: store PDFs, Word and PowerPoint files (up to 10 MB) and summarize them.
- **Profile** (/profile): name, position, department, affiliation, photo (click the photo), bio, research interests, ORCID, Google Scholar and website.
  - **Public profile**: turn on **Make my profile public**, choose a link like /u/your-name and save. Visitors see the bio, metrics and publications — never the email.
- **Printable CV** (/cv): pick APA, MLA or IEEE and click **Print / Save PDF**.
- **Support** (/support): FAQ, **Raise a ticket** (category, priority, description, up to 3 attachments) and **My tickets** with replies from staff. Tickets can be closed, reopened and rated.
- **Theme**: the sun/moon button in the top bar switches light, dark or system.
- **Account menu**: click the avatar (top right) for Profile, Public profile, Printable CV and Sign out.
- h-index = the largest h where h papers have at least h citations each. i10-index = papers with at least 10 citations.`;

// ---------------------------------------------------------------- helpers

function hIndex(citations: number[]) {
  const sorted = [...citations].sort((a, b) => b - a);
  let h = 0;
  while (h < sorted.length && sorted[h] >= h + 1) h++;
  return h;
}

function normalizeDoi(input: string): string | null {
  const match = /10\.\d{4,9}\/\S+/i.exec(input.trim());
  return match ? match[0].replace(/[.,;)\]]+$/, '') : null;
}

const stripTags = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function lookupDoi(raw: string) {
  const doi = normalizeDoi(raw);
  if (!doi) return { error: 'Not a valid DOI. DOIs start with "10.", e.g. 10.1038/nature14539.' };
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: { 'User-Agent': 'CiteCraft/2.0 (https://citecraft.netlify.app)' },
  });
  if (res.status === 404) return { error: `No publication found for DOI ${doi}.` };
  if (!res.ok) return { error: 'Crossref is not responding right now.' };
  // deno-lint-ignore no-explicit-any
  const w: any = (await res.json()).message;
  const typeMap: Record<string, string> = {
    'journal-article': 'journal',
    'proceedings-article': 'conference',
    book: 'book',
    monograph: 'book',
    'book-chapter': 'chapter',
  };
  return {
    doi: w.DOI ?? doi,
    title: w.title?.[0] ?? '',
    // deno-lint-ignore no-explicit-any
    authors: (w.author ?? []).map((a: any) => a.name ?? [a.given, a.family].filter(Boolean).join(' ')),
    type: typeMap[w.type] ?? 'other',
    venue: w['container-title']?.[0] ?? null,
    year: (w.issued ?? w.published)?.['date-parts']?.[0]?.[0] ?? null,
    citations: w['is-referenced-by-count'] ?? 0,
    url: w.URL ?? null,
    abstract: w.abstract ? stripTags(w.abstract).slice(0, 2000) : null,
    subjects: (w.subject ?? []).slice(0, 5),
  };
}

// ---------------------------------------------------------------- tools

function buildTools(db: SupabaseClient, userId: string, actions: Action[]) {
  const getMyOverview = betaTool({
    name: 'get_my_overview',
    description:
      "Get the user's profile and research summary: number of publications, total citations, h-index, i10-index, most recent publications and open support tickets.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    strict: true,
    run: async () => {
      const [profile, pubs, tickets] = await Promise.all([
        db.from('profiles').select('full_name, position, department, affiliation, is_public, public_slug').eq('id', userId).maybeSingle(),
        db.from('publications').select('title, year, type, citations').eq('user_id', userId).order('year', { ascending: false }),
        db.from('tickets').select('ticket_number, subject, status').eq('user_id', userId).not('status', 'in', '(resolved,closed)'),
      ]);
      const list = pubs.data ?? [];
      const cites = list.map(p => p.citations ?? 0);
      return JSON.stringify({
        profile: profile.data,
        publications: list.length,
        totalCitations: cites.reduce((a, b) => a + b, 0),
        hIndex: hIndex(cites),
        i10Index: cites.filter(c => c >= 10).length,
        recent: list.slice(0, 5),
        openTickets: tickets.data ?? [],
      });
    },
  });

  const searchMyPublications = betaTool({
    name: 'search_my_publications',
    description:
      "Search the user's own publications by words in the title, venue, authors or tags. Use an empty query to list the most recent ones.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to search for, or "" for all.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    strict: true,
    run: async ({ query }) => {
      const { data, error } = await db
        .from('publications')
        .select('title, authors, type, journal, conference, book, year, doi, citations, tags')
        .eq('user_id', userId)
        .order('year', { ascending: false })
        .limit(200);
      if (error) return `Error: ${error.message}`;
      const q = query.trim().toLowerCase();
      const matches = (data ?? []).filter(p =>
        !q
          ? true
          : [p.title, p.journal, p.conference, p.book, ...(p.authors ?? []), ...(p.tags ?? [])].some(v =>
              String(v ?? '').toLowerCase().includes(q),
            ),
      );
      return JSON.stringify({ total: matches.length, results: matches.slice(0, 15) });
    },
  });

  const lookupDoiTool = betaTool({
    name: 'lookup_doi',
    description: 'Fetch publication details (title, authors, venue, year, citation count) for a DOI from Crossref.',
    inputSchema: {
      type: 'object',
      properties: { doi: { type: 'string', description: 'A DOI such as 10.1038/nature14539 or a doi.org link.' } },
      required: ['doi'],
      additionalProperties: false,
    },
    strict: true,
    run: async ({ doi }) => JSON.stringify(await lookupDoi(doi)),
  });

  const addPublication = betaTool({
    name: 'add_publication',
    description:
      "Add a publication to the user's library. Only call after showing the details and getting the user's explicit confirmation.",
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        authors: { type: 'array', items: { type: 'string' }, description: 'Full names, in author order.' },
        type: { type: 'string', enum: ['journal', 'conference', 'book', 'chapter', 'other'] },
        year: { type: 'integer' },
        venue: { type: ['string', 'null'], description: 'Journal, conference or book title.' },
        doi: { type: ['string', 'null'] },
        url: { type: ['string', 'null'] },
        abstract: { type: ['string', 'null'] },
        citations: { type: ['integer', 'null'] },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'authors', 'type', 'year', 'venue', 'doi', 'url', 'abstract', 'citations', 'tags'],
      additionalProperties: false,
    },
    strict: true,
    run: async input => {
      const title = input.title.trim();
      if (!title || title.length > 500) return 'Error: the title must be 1–500 characters.';
      if (input.year < 1900 || input.year > 2100) return 'Error: the year must be between 1900 and 2100.';
      const doi = input.doi ? normalizeDoi(input.doi) : null;
      if (doi) {
        const { data: existing } = await db.from('publications').select('id, title').eq('user_id', userId).ilike('doi', doi);
        if (existing && existing.length) return `Not added: "${existing[0].title}" with this DOI is already in the library.`;
      }
      const url = input.url && /^https?:\/\//i.test(input.url) ? input.url : null;
      const venue = input.venue?.trim() || null;
      const { data, error } = await db
        .from('publications')
        .insert({
          user_id: userId,
          title,
          authors: input.authors.map(a => a.trim()).filter(Boolean).slice(0, 100),
          type: input.type,
          year: input.year,
          journal: input.type === 'journal' ? venue : null,
          conference: input.type === 'conference' ? venue : null,
          book: input.type === 'book' || input.type === 'chapter' ? venue : null,
          doi,
          url,
          abstract: input.abstract?.slice(0, 5000) ?? null,
          citations: Math.max(0, input.citations ?? 0),
          tags: input.tags.map(t => t.trim()).filter(Boolean).slice(0, 20),
        })
        .select('id, title')
        .single();
      if (error) return `Error: could not add the publication (${error.message}).`;
      actions.push({ type: 'publication_added', id: data.id, title: data.title });
      return `Added "${data.title}" to the user's library.`;
    },
  });

  const raiseTicket = betaTool({
    name: 'raise_support_ticket',
    description:
      'Create a support ticket for a problem the assistant cannot solve. Only call after showing the ticket and getting explicit confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string', enum: ['bug', 'account', 'publication', 'feature', 'other'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['subject', 'description', 'category', 'priority'],
      additionalProperties: false,
    },
    strict: true,
    run: async input => {
      const { data, error } = await db
        .from('tickets')
        .insert({
          user_id: userId,
          subject: input.subject.trim().slice(0, 200),
          description: input.description.trim().slice(0, 5000),
          category: input.category,
          priority: input.priority,
        })
        .select('id, ticket_number, subject')
        .single();
      if (error) return `Error: could not create the ticket (${error.message}).`;
      actions.push({ type: 'ticket_created', id: data.id, ticketNumber: data.ticket_number, subject: data.subject });
      return `Created ticket #CC-${data.ticket_number}. The user can follow it on the Support page.`;
    },
  });

  return [getMyOverview, searchMyPublications, lookupDoiTool, addPublication, raiseTicket];
}

// ---------------------------------------------------------------- handler

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'The AI assistant is not configured yet.' }, 503);

  // Authenticate as the calling user.
  const authHeader = req.headers.get('Authorization') ?? '';
  const anonKey = req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const db = createClient(Deno.env.get('SUPABASE_URL')!, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return json({ error: 'Please sign in again.' }, 401);
  const userId = auth.user.id;

  // Validate input.
  let body: { messages?: { role?: string; content?: unknown }[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const history = (body.messages ?? [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map(m => ({ role: m.role as 'user' | 'assistant', content: (m.content as string).slice(0, MAX_MESSAGE_CHARS) }));
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length || history[history.length - 1].role !== 'user') {
    return json({ error: 'Send a message to start.' }, 400);
  }

  // Daily limit.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await db
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', 'chat')
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({ error: `You've reached today's limit of ${DAILY_LIMIT} assistant messages. Try again tomorrow.` }, 429);
  }
  await db.from('ai_usage').insert({ user_id: userId, kind: 'chat' });

  const { data: profile } = await db.from('profiles').select('full_name').eq('id', userId).maybeSingle();
  const actions: Action[] = [];
  const client = new Anthropic({ apiKey });

  try {
    const finalMessage = await client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 16000,
      max_iterations: 6,
      output_config: { effort: 'low' },
      ...(FALLBACK_MODELS.has(MODEL)
        ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
        : {}),
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        {
          type: 'text',
          text: `The user's name is ${profile?.full_name || 'not set yet'}. Today is ${new Date().toDateString()}.`,
        },
      ],
      tools: buildTools(db, userId, actions),
      messages: history,
    });

    if (finalMessage.stop_reason === 'refusal') {
      return json({ reply: "Sorry, I can't help with that request.", actions });
    }
    const reply = finalMessage.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map(b => b.text)
      .join('\n\n')
      .trim();
    return json({ reply: reply || 'Done.', actions });
  } catch (error) {
    console.error('assistant error', error);
    if (error instanceof Anthropic.RateLimitError) {
      return json({ error: 'The assistant is busy right now. Please try again in a moment.' }, 503);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return json({ error: 'The AI assistant is not configured correctly.' }, 503);
    }
    if (error instanceof Anthropic.APIError) {
      return json({ error: 'The assistant could not answer. Please try again.' }, 502);
    }
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
