import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService, backendMode, profileService, type SignUpParams, type SignUpResult } from '@/services';
import type { AuthUser, Profile } from '@/types';

export interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  /** support staff (profiles.role = 'admin') */
  isAdmin: boolean;
  /** true until the initial session check finishes */
  loading: boolean;
  mode: typeof backendMode;
  signIn: (email: string, password: string) => Promise<void>;
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

  useEffect(() => {
    let active = true;

    authService
      .getCurrentUser()
      .then(async current => {
        if (!active) return;
        setUser(current);
        await loadProfile(current);
      })
      .catch(error => console.error('Failed to restore session', error))
      .finally(() => active && setLoading(false));

    const unsubscribe = authService.onAuthChange(next => {
      if (!active) return;
      setUser(prev => {
        if (prev?.id !== next?.id) {
          queryClient.clear();
          void loadProfile(next);
        }
        return next;
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadProfile, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isAdmin: profile?.role === 'admin',
      loading,
      mode: backendMode,
      signIn: async (email, password) => {
        const signedIn = await authService.signIn(email, password);
        setUser(signedIn);
        await loadProfile(signedIn);
      },
      signUp: async params => {
        const result = await authService.signUp(params);
        if (result.signedIn) {
          const current = await authService.getCurrentUser();
          setUser(current);
          await loadProfile(current);
        }
        return result;
      },
      signOut: async () => {
        await authService.signOut();
        queryClient.clear();
        setUser(null);
        setProfile(null);
      },
      refreshProfile: () => loadProfile(user),
      setProfile,
    }),
    [user, profile, loading, loadProfile, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
