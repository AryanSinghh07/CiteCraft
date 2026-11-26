import type { SecurityStatus } from '@/services';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

/**
 * Account security level: email verified (1) + strong password (1) + two-factor (2).
 * 0–1 Low · 2–3 Medium · 4 High.
 */
type Level = { name: 'Low' | 'Medium' | 'High'; score: number; color: string; icon: typeof Shield };

export function securityLevel(status: Pick<SecurityStatus, 'emailVerified' | 'passwordScore' | 'factors'>): Level {
  const twoFactor = status.factors.some(f => f.verified);
  const score = (status.emailVerified ? 1 : 0) + ((status.passwordScore ?? 0) >= 3 ? 1 : 0) + (twoFactor ? 2 : 0);
  if (score >= 4) return { name: 'High', score, color: 'text-emerald-600 dark:text-emerald-400', icon: ShieldCheck };
  if (score >= 2) return { name: 'Medium', score, color: 'text-amber-600 dark:text-amber-400', icon: Shield };
  return { name: 'Low', score, color: 'text-red-600 dark:text-red-400', icon: ShieldAlert };
}
