import { Link } from 'react-router-dom';
import type { Ticket } from '@/types';
import { MessageSquare, UserRound } from 'lucide-react';
import { PriorityLabel, StatusBadge } from './TicketBadges';
import { SHORT_CATEGORY_LABELS, formatTicketNumber, timeAgo } from '../utils/ticketMeta';

interface TicketListProps {
  tickets: Ticket[];
  /** staff view shows requester and assignee */
  forStaff?: boolean;
  staffNames?: Record<string, string>;
  emptyMessage: string;
}

const TicketList = ({ tickets, forStaff = false, staffNames = {}, emptyMessage }: TicketListProps) => {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border bg-card">
      {tickets.map((ticket, index) => (
        <li key={ticket.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}>
          <Link
            to={`/support/${ticket.id}`}
            className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus:outline-none sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-xs text-muted-foreground">{formatTicketNumber(ticket.ticketNumber)}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{SHORT_CATEGORY_LABELS[ticket.category]}</span>
              </div>
              <p className="font-medium truncate">{ticket.subject}</p>
              {forStaff && (
                <p className="text-xs text-muted-foreground truncate">
                  {ticket.requesterName || 'Unknown'} · {ticket.requesterEmail}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end sm:gap-4">
              <PriorityLabel priority={ticket.priority} />
              {forStaff && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground min-w-[90px]">
                  <UserRound className="h-3 w-3" />
                  {ticket.assignedTo ? staffNames[ticket.assignedTo] ?? 'Assigned' : 'Unassigned'}
                </span>
              )}
              <StatusBadge status={ticket.status} forStaff={forStaff} />
              <span className="text-xs text-muted-foreground w-16 text-right">{timeAgo(ticket.updatedAt)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default TicketList;
