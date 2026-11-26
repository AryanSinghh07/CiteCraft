import { requireSupabase } from '@/lib/supabase';
import type { SecurityService } from '../types';

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export const supabaseSecurity: SecurityService = {
  available: { mfa: true, otherDevices: true },

  async getStatus() {
    const client = requireSupabase();
    const [{ data: userData, error: userError }, { data: factors, error: factorError }] = await Promise.all([
      client.auth.getUser(),
      client.auth.mfa.listFactors(),
    ]);
    fail(userError);
    fail(factorError);
    const user = userData.user;
    const meta = (user?.user_metadata ?? {}) as { password_strength?: number; password_changed_at?: string };
    return {
      emailVerified: Boolean(user?.email_confirmed_at),
      lastSignInAt: user?.last_sign_in_at ?? undefined,
      passwordScore: typeof meta.password_strength === 'number' ? meta.password_strength : undefined,
      passwordChangedAt: meta.password_changed_at,
      factors: (factors?.totp ?? []).map(f => ({
        id: f.id,
        name: f.friendly_name || 'Authenticator app',
        createdAt: f.created_at,
        verified: f.status === 'verified',
      })),
    };
  },

  async enrollTotp() {
    const client = requireSupabase();
    // Clean up abandoned (never verified) set-ups first, so re-trying works.
    const { data: existing } = await client.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.status !== 'verified') await client.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Authenticator ${new Date().toLocaleDateString()}`,
    });
    fail(error);
    return { factorId: data!.id, qrCode: data!.totp.qr_code, secret: data!.totp.secret };
  },

  async verifyTotp(factorId, code) {
    const { error } = await requireSupabase().auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') });
    if (error) throw new Error(/invalid|expired/i.test(error.message) ? 'That code is wrong or expired. Try the newest code.' : error.message);
  },

  async removeFactor(factorId) {
    const { error } = await requireSupabase().auth.mfa.unenroll({ factorId });
    fail(error);
  },

  async mfaRequirement() {
    const client = requireSupabase();
    const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return { required: false };
    if (data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
      const { data: factors } = await client.auth.mfa.listFactors();
      const factor = factors?.totp.find(f => f.status === 'verified');
      return factor ? { required: true, factorId: factor.id } : { required: false };
    }
    return { required: false };
  },

  async changePassword(newPassword, score) {
    const { error } = await requireSupabase().auth.updateUser({
      password: newPassword,
      data: { password_strength: score, password_changed_at: new Date().toISOString() },
    });
    fail(error);
  },

  async recordPasswordStrength(score) {
    await requireSupabase().auth.updateUser({
      data: { password_strength: score, password_changed_at: new Date().toISOString() },
    });
  },

  async signOutOtherDevices() {
    const { error } = await requireSupabase().auth.signOut({ scope: 'others' });
    fail(error);
  },
};
