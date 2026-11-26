import type { User } from '@supabase/supabase-js';
import { BUCKETS, requireSupabase } from '@/lib/supabase';
import type { AuthUser } from '@/types';
import type { AuthService } from '../types';

const toAuthUser = (user: User | null | undefined): AuthUser | null =>
  user ? { id: user.id, email: user.email ?? '' } : null;

export const supabaseAuth: AuthService = {
  async getCurrentUser() {
    const { data } = await requireSupabase().auth.getSession();
    return toAuthUser(data.session?.user);
  },

  async signIn(email, password) {
    const { data, error } = await requireSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(error.message);
    return toAuthUser(data.user)!;
  },

  async signUp({ name, email, password, accountType }) {
    const { data, error } = await requireSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim(), account_type: accountType },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw new Error(error.message);
    return { signedIn: Boolean(data.session) };
  },

  async signOut() {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw new Error(error.message);
  },

  async sendPasswordReset(email) {
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  },

  async updatePassword(newPassword) {
    const { error } = await requireSupabase().auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  async deleteAccount() {
    const client = requireSupabase();
    const { data } = await client.auth.getUser();
    const userId = data.user?.id;
    if (!userId) throw new Error('Please sign in again.');

    // 1. Delete stored files (the database cascade can't remove the files themselves).
    const removeFolder = async (bucket: string, folder: string) => {
      const { data: files } = await client.storage.from(bucket).list(folder, { limit: 1000 });
      const paths = (files ?? []).filter(f => f.name).map(f => `${folder}/${f.name}`);
      if (paths.length) await client.storage.from(bucket).remove(paths);
    };
    const { data: tickets } = await client.from('tickets').select('id').eq('user_id', userId);
    await Promise.allSettled([
      removeFolder(BUCKETS.avatars, userId),
      removeFolder(BUCKETS.documents, userId),
      ...(tickets ?? []).map(t => removeFolder(BUCKETS.ticketAttachments, t.id)),
    ]);

    // 2. Delete the account; everything else is removed by ON DELETE CASCADE.
    const { error } = await client.rpc('delete_my_account');
    if (error) {
      throw new Error(
        /Two-factor/i.test(error.message)
          ? 'Please sign out and back in with your 2FA code, then try again.'
          : /function .* does not exist|schema cache/i.test(error.message)
            ? 'Account deletion isn’t set up on the server yet (migration 0009). Please contact support.'
            : error.message,
      );
    }
    await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
  },

  onAuthChange(callback) {
    const { data } = requireSupabase().auth.onAuthStateChange((_event, session) => {
      callback(toAuthUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  },
};
