import { env } from '@/config/env';
import { requireSupabase } from '@/lib/supabase';
import type { AssistantReply, SummaryRecord } from '@/types';
import type { AiService } from '../types';

interface SummaryRow {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  length: SummaryRecord['length'];
  focus: SummaryRecord['focus'];
  summary: string;
  created_at: string;
}

const fromRow = (r: SummaryRow): SummaryRecord => ({
  id: r.id,
  fileName: r.file_name,
  mimeType: r.mime_type,
  sizeBytes: r.size_bytes,
  length: r.length,
  focus: r.focus,
  summary: r.summary,
  createdAt: r.created_at,
});

/** Reads the JSON error body an edge function returned, if any. */
async function functionError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (body?.error) return body.error as string;
  } catch {
    /* not JSON */
  }
  if (response.status === 404) return 'The AI features have not been deployed yet.';
  return `The server returned an error (${response.status}).`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await requireSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again.');
  return {
    Authorization: `Bearer ${token}`,
    apikey: env.supabaseAnonKey,
    'Content-Type': 'application/json',
  };
}

const functionUrl = (name: string) => `${env.supabaseUrl.replace(/\/$/, '')}/functions/v1/${name}`;

export const supabaseAi: AiService = {
  available: true,

  async chat(messages) {
    let response: Response;
    try {
      response = await fetch(functionUrl('assistant'), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ messages }),
      });
    } catch {
      throw new Error('Could not reach the assistant. Check your connection.');
    }
    if (!response.ok) throw new Error(await functionError(response));
    return (await response.json()) as AssistantReply;
  },

  async summarize(request, onText, signal) {
    let response: Response;
    try {
      response = await fetch(functionUrl('summarize'), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(request),
        signal,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error;
      throw new Error('Could not reach the summarizer. Check your connection.');
    }
    if (!response.ok || !response.body) throw new Error(await functionError(response));

    // Newline-delimited JSON events.
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let result: { id: string | null; truncated: boolean } | null = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        const event = JSON.parse(line) as
          | { type: 'text'; text: string }
          | { type: 'done'; id: string | null; truncated?: boolean }
          | { type: 'error'; message: string };
        if (event.type === 'text') onText(event.text);
        else if (event.type === 'done') result = { id: event.id, truncated: Boolean(event.truncated) };
        else throw new Error(event.message);
      }
    }
    if (!result) throw new Error('The summary was interrupted. Please try again.');
    return result;
  },

  async listSummaries(userId) {
    const { data, error } = await requireSupabase()
      .from('document_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<SummaryRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(fromRow);
  },

  async deleteSummary(userId, id) {
    const { error } = await requireSupabase().from('document_summaries').delete().eq('id', id).eq('user_id', userId);
    if (error) throw new Error(error.message);
  },
};
