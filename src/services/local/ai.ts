import type { AiService } from '../types';

const UNAVAILABLE =
  'The AI summarizer runs on the CiteCraft server, so it is not available in demo mode. Connect Supabase (see docs/SETUP.md) to use it.';

/** Demo mode has no server, so the summarizer explains how to enable it. */
export const localAi: AiService = {
  available: false,

  async summarize() {
    throw new Error(UNAVAILABLE);
  },

  async listSummaries() {
    return [];
  },

  async deleteSummary() {
    /* nothing stored in demo mode */
  },
};
