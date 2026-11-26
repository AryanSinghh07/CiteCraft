import { cn } from '@/lib/utils';
import type { Ticket, TicketAttachment, TicketMessage } from '@/types';
import { FileText, Lock, ShieldCheck } from 'lucide-react';
import { timeAgo } from '../utils/ticketMeta';

interface TicketThreadProps {
  ticket: Ticket;
  messages: TicketMessage[];
  attachments: TicketAttachment[];
  currentUserId: string;
  onOpenAttachment: (attachment: TicketAttachment) => void;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?';

const AttachmentChips = ({
  items,
  onOpen,
}: {
  items: TicketAttachment[];
  onOpen: (a: TicketAttachment) => void;
}) =>
  items.length === 0 ? null : (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map(a => (
        <button
          key={a.id}
          type="button"
          onClick={() => onOpen(a)}
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors"
        >
          <FileText className="h-3 w-3 text-primary" />
          <span className="max-w-[180px] truncate">{a.name}</span>
        </button>
      ))}
    </div>
  );

interface BubbleProps {
  name: string;
  role: 'user' | 'admin';
  isInternal?: boolean;
  isOwn: boolean;
  createdAt: string;
  body: string;
  files: TicketAttachment[];
  onOpenAttachment: (a: TicketAttachment) => void;
}

const Bubble = ({ name, role, isInternal, isOwn, createdAt, body, files, onOpenAttachment }: BubbleProps) => (
  <li className={cn('flex gap-3 animate-fade-in', isOwn && 'flex-row-reverse')}>
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
    <div className={cn('max-w-[85%] sm:max-w-[75%] space-y-1', isOwn && 'items-end text-right')}>
      <div className={cn('flex flex-wrap items-center gap-2 text-xs', isOwn && 'justify-end')}>
        <span className="font-medium">{name || 'Unknown'}</span>
        {role === 'admin' && (
          <span className="inline-flex items-center gap-0.5 text-primary">
            <ShieldCheck className="h-3 w-3" /> Support
          </span>
        )}
        {isInternal && (
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-400">
            <Lock className="h-3 w-3" /> Internal note
          </span>
        )}
        <span className="text-muted-foreground" title={new Date(createdAt).toLocaleString()}>
          {timeAgo(createdAt)}
        </span>
      </div>
      <div
        className={cn(
          'rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words text-left',
          isInternal
            ? 'border border-dashed border-amber-500/40 bg-amber-500/5'
            : isOwn
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm',
        )}
      >
        {body}
      </div>
      <AttachmentChips items={files} onOpen={onOpenAttachment} />
    </div>
  </li>
);

/** The original request followed by every reply, oldest first. */
const TicketThread = ({ ticket, messages, attachments, currentUserId, onOpenAttachment }: TicketThreadProps) => {
  const filesFor = (messageId: string | null) => attachments.filter(a => a.messageId === messageId);

  return (
    <ol className="space-y-6">
      <Bubble
        name={ticket.requesterName}
        role="user"
        isOwn={ticket.userId === currentUserId}
        createdAt={ticket.createdAt}
        body={ticket.description}
        files={filesFor(null)}
        onOpenAttachment={onOpenAttachment}
      />
      {messages.map(m => (
        <Bubble
          key={m.id}
          name={m.authorName}
          role={m.authorRole}
          isInternal={m.isInternal}
          isOwn={m.authorId === currentUserId}
          createdAt={m.createdAt}
          body={m.body}
          files={filesFor(m.id)}
          onOpenAttachment={onOpenAttachment}
        />
      ))}
    </ol>
  );
};

export default TicketThread;
