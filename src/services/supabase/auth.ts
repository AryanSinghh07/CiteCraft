import type { User } from '@supabase/supabase-js';
import { requireSupabase } from '@/lib/supabase';
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

  onAuthChange(callback) {
    const { data } = requireSupabase().auth.onAuthStateChange((_event, session) => {
      callback(toAuthUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  },
};
