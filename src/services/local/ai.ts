import type { SummaryRecord } from '@/types';
import type { AiService } from '../types';
import { readJson, writeJson } from './storage';

const UNAVAILABLE =
  'The AI summarizer runs on the CiteCraft server, so it is not available in demo mode. Use the quick summary instead.';
const key = (userId: string) => `citecraft:summaries:${userId}`;

/** Demo mode: no AI server, but quick (in-browser) summaries are kept in this browser's history. */
export const localAi: AiService = {
  available: false,

  async summarize() {
    throw new Error(UNAVAILABLE);
  },

  async listSummaries(userId) {
    return readJson<SummaryRecord[]>(key(userId), []);
  },

  async saveSummary(userId, r) {
    const record: SummaryRecord = { ...r, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    writeJson(key(userId), [record, ...readJson<SummaryRecord[]>(key(userId), [])].slice(0, 50));
    return record;
  },

  async deleteSummary(userId, id) {
    writeJson(key(userId), readJson<SummaryRecord[]>(key(userId), []).filter(s => s.id !== id));
  },
};
