import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  authService,
  backendMode,
  profileService,
  securityService,
  type SignUpParams,
  type SignUpResult,
} from '@/services';
import type { AuthUser, Profile } from '@/types';

export interface AuthContextValue {
  /** the signed-in user — only set once any required 2FA step is complete */
  user: AuthUser | null;
  profile: Profile | null;
  /** support staff (profiles.role = 'admin') */
  isAdmin: boolean;
  /** true until the initial session check finishes */
  loading: boolean;
  mode: typeof backendMode;
  /** password accepted, waiting for the authenticator-app code */
  pendingMfa: { factorId: string; email: string } | null;
  signIn: (email: string, password: string) => Promise<{ mfaRequired: boolean }>;
  verifyMfa: (code: string) => Promise<void>;
  cancelMfa: () => Promise<void>;
  signUp: (params: SignUpParams) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: Profile) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMfa, setPendingMfa] = useState<AuthContextValue['pendingMfa']>(null);
  const currentId = useRef<string | null>(null);

  const loadProfile = useCallback(async (authUser: AuthUser | null) => {
    if (!authUser) {
      setProfile(null);
      return;
    }
    try {
      const loaded = await profileService.getProfile(authUser.id);
      setProfile(
        loaded ?? {
          id: authUser.id,
          name: '',
          email: authUser.email,
          affiliation: '',
          position: '',
          department: '',
        },
      );
    } catch (error) {
      console.error('Failed to load profile', error);
    }
  }, []);

  /**
   * Lets a session in only when it has passed every required step. Accounts with
   * two-factor authentication stay "pending" until the code is verified.
   * Returns true when the user is now signed in.
   */
  const admit = useCallback(
    async (next: AuthUser | null): Promise<boolean> => {
      if (!next) {
        if (currentId.current) queryClient.clear();
        currentId.current = null;
        setPendingMfa(null);
        setUser(null);
        setProfile(null);
        return false;
      }
      const mfa = await securityService.mfaRequirement().catch(() => ({ required: false, factorId: undefined }));
      if (mfa.required && mfa.factorId) {
        setPendingMfa({ factorId: mfa.factorId, email: next.email });
        setUser(null);
        setProfile(null);
        return false;
      }
      setPendingMfa(null);
      if (currentId.current !== next.id) {
        queryClient.clear();
        currentId.current = next.id;
        await loadProfile(next);
      }
      setUser(next);
      return true;
    },
    [loadProfile, queryClient],
  );

  useEffect(() => {
    let active = true;

    authService
      .getCurrentUser()
      .then(current => (active ? admit(current) : false))
      .catch(error => console.error('Failed to restore session', error))
      .finally(() => active && setLoading(false));

    // Run outside the auth library's callback (it must not await other auth calls).
    const unsubscribe = authService.onAuthChange(next => {
      if (active) setTimeout(() => void admit(next), 0);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [admit]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isAdmin: profile?.role === 'admin',
      loading,
      mode: backendMode,
      pendingMfa,
      signIn: async (email, password) => {
        const signedIn = await authService.signIn(email, password);
        const admitted = await admit(signedIn);
        return { mfaRequired: !admitted };
      },
      verifyMfa: async code => {
        if (!pendingMfa) throw new Error('Please sign in again.');
        await securityService.verifyTotp(pendingMfa.factorId, code);
        const current = await authService.getCurrentUser();
        const admitted = await admit(current);
        if (!admitted) throw new Error('Verification did not complete. Please try again.');
      },
      cancelMfa: async () => {
        await authService.signOut();
        await admit(null);
      },
      signUp: async params => {
        const result = await authService.signUp(params);
        if (result.signedIn) await admit(await authService.getCurrentUser());
        return result;
      },
      signOut: async () => {
        await authService.signOut();
        await admit(null);
      },
      refreshProfile: () => loadProfile(user),
      setProfile,
    }),
    [user, profile, loading, pendingMfa, admit, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
