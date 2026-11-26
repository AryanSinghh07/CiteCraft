import type { SecurityService } from '../types';
import { localAuth } from './auth';
import { readJson, writeJson } from './storage';

const metaKey = (userId: string) => `citecraft:security:${userId}`;
const sessionUser = () => readJson<string | null>('citecraft:session', null);
const UNAVAILABLE = 'Two-factor authentication needs the CiteCraft server, so it is not available in demo mode.';

/** Demo mode: password changes work; 2FA and device sign-out need a real server. */
export const localSecurity: SecurityService = {
  available: { mfa: false, otherDevices: false },

  async getStatus() {
    const userId = sessionUser();
    const meta = userId ? readJson<{ score?: number; changedAt?: string }>(metaKey(userId), {}) : {};
    return { emailVerified: true, factors: [], passwordScore: meta.score, passwordChangedAt: meta.changedAt };
  },

  async enrollTotp() {
    throw new Error(UNAVAILABLE);
  },
  async verifyTotp() {
    throw new Error(UNAVAILABLE);
  },
  async removeFactor() {
    throw new Error(UNAVAILABLE);
  },
  async mfaRequirement() {
    return { required: false };
  },

  async changePassword(newPassword, score) {
    await localAuth.updatePassword(newPassword);
    await this.recordPasswordStrength(score);
  },

  async recordPasswordStrength(score) {
    const userId = sessionUser();
    if (userId) writeJson(metaKey(userId), { score, changedAt: new Date().toISOString() });
  },

  async signOutOtherDevices() {
    throw new Error('Demo mode only has this browser, so there are no other devices to sign out.');
  },
};
