import type { AiService } from '../types';

const UNAVAILABLE =
  'The AI assistant and summarizer run on the CiteCraft server, so they are not available in demo mode. Connect Supabase (see docs/SETUP.md) to use them.';

/** Demo mode has no server, so AI features explain how to enable them. */
export const localAi: AiService = {
  available: false,

  async chat() {
    return {
      reply: `${UNAVAILABLE}\n\nMeanwhile, the **Help & Support** page has quick answers to common questions.`,
      actions: [],
    };
  },

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
