import { cn } from '@/lib/utils';
import type { TicketPriority, TicketStatus } from '@/types';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { PRIORITY_META, STATUS_META, statusLabel } from '../utils/ticketMeta';

export const StatusBadge = ({ status, forStaff = false }: { status: TicketStatus; forStaff?: boolean }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
      STATUS_META[status].className,
    )}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
    {statusLabel(status, forStaff)}
  </span>
);

const PRIORITY_ICON = { low: ArrowDown, medium: ArrowRight, high: ArrowUp };

export const PriorityLabel = ({ priority }: { priority: TicketPriority }) => {
  const Icon = PRIORITY_ICON[priority];
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', PRIORITY_META[priority].className)}>
      <Icon className="h-3 w-3" aria-hidden />
      {PRIORITY_META[priority].label}
    </span>
  );
};
