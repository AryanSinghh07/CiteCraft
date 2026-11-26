import type { TicketCategory, TicketPriority, TicketStatus } from '@/types';

/** Display labels and colours for ticket fields. */

export const formatTicketNumber = (n: number) => `#CC-${n}`;

export const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  in_progress: {
    label: 'In Progress',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  waiting_on_user: {
    label: 'Waiting on You',
    className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border' },
};

/** Staff see "Waiting on User"; requesters see "Waiting on You". */
export const statusLabel = (status: TicketStatus, forStaff: boolean) =>
  status === 'waiting_on_user' && forStaff ? 'Waiting on User' : STATUS_META[status].label;

export const PRIORITY_META: Record<TicketPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'text-muted-foreground' },
  medium: { label: 'Medium', className: 'text-amber-600 dark:text-amber-400' },
  high: { label: 'High', className: 'text-red-600 dark:text-red-400' },
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: 'Bug / Something broken',
  account: 'Account & login',
  publication: 'Publication data',
  feature: 'Feature request',
  other: 'Other',
};

export const SHORT_CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: 'Bug',
  account: 'Account',
  publication: 'Publication',
  feature: 'Feature',
  other: 'Other',
};

export const STATUSES = Object.keys(STATUS_META) as TicketStatus[];
export const PRIORITIES = Object.keys(PRIORITY_META) as TicketPriority[];
export const CATEGORIES = Object.keys(CATEGORY_LABELS) as TicketCategory[];

/** Tickets that still need attention. */
export const isActive = (status: TicketStatus) => status !== 'resolved' && status !== 'closed';

export function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDuration(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60_000))}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}
