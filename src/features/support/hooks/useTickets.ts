import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ticketService } from '@/services';
import type { Ticket, TicketAttachment, TicketInput, TicketUpdate } from '@/types';

/** Refresh interval for ticket views so replies show up without reloading. */
const POLL_MS = 15_000;

export const ticketKeys = {
  all: ['tickets'] as const,
  mine: (userId?: string) => ['tickets', 'mine', userId] as const,
  admin: ['tickets', 'admin'] as const,
  detail: (id: string) => ['tickets', 'detail', id] as const,
  messages: (id: string) => ['tickets', 'messages', id] as const,
  attachments: (id: string) => ['tickets', 'attachments', id] as const,
  staff: ['tickets', 'staff'] as const,
};

/** The signed-in user's own tickets, plus creating a new one. */
export function useMyTickets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ticketKeys.mine(user?.id),
    queryFn: () => ticketService.listMine(user!.id),
    enabled: Boolean(user),
    refetchInterval: POLL_MS,
  });

  const create = useMutation({
    mutationFn: ({ input, files }: { input: TicketInput; files: File[] }) =>
      ticketService.create(user!.id, input, files),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
  });

  return { tickets: query.data ?? [], isLoading: query.isLoading, error: query.error as Error | null, create };
}

/** Every ticket, for the admin panel. */
export function useAllTickets() {
  const { isAdmin } = useAuth();
  const query = useQuery({
    queryKey: ticketKeys.admin,
    queryFn: () => ticketService.listAll(),
    enabled: isAdmin,
    refetchInterval: POLL_MS,
  });
  return {
    tickets: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useStaff() {
  const { isAdmin } = useAuth();
  return useQuery({ queryKey: ticketKeys.staff, queryFn: () => ticketService.listStaff(), enabled: isAdmin });
}

/** One ticket with its conversation and files. */
export function useTicket(ticketId: string) {
  const queryClient = useQueryClient();

  const ticket = useQuery({
    queryKey: ticketKeys.detail(ticketId),
    queryFn: () => ticketService.get(ticketId),
    refetchInterval: POLL_MS,
  });
  const messages = useQuery({
    queryKey: ticketKeys.messages(ticketId),
    queryFn: () => ticketService.listMessages(ticketId),
    enabled: Boolean(ticket.data),
    refetchInterval: POLL_MS,
  });
  const attachments = useQuery({
    queryKey: ticketKeys.attachments(ticketId),
    queryFn: () => ticketService.listAttachments(ticketId),
    enabled: Boolean(ticket.data),
    refetchInterval: POLL_MS,
  });

  const refreshLists = () => queryClient.invalidateQueries({ queryKey: ticketKeys.all });

  const reply = useMutation({
    mutationFn: (message: { body: string; isInternal?: boolean; files?: File[] }) =>
      ticketService.addMessage(ticketId, message),
    onSuccess: refreshLists,
  });

  const update = useMutation({
    mutationFn: (patch: TicketUpdate) => ticketService.update(ticketId, patch),
    onSuccess: updated => {
      queryClient.setQueryData<Ticket | null>(ticketKeys.detail(ticketId), updated);
      void refreshLists();
    },
  });

  const openAttachment = async (attachment: TicketAttachment) => {
    const url = await ticketService.getAttachmentUrl(attachment);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
    if (url.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  /** The attachment itself, for the in-app viewer. */
  const loadAttachment = async (attachment: TicketAttachment): Promise<Blob> => {
    const url = await ticketService.getAttachmentUrl(attachment);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('This file could not be downloaded. Try again in a moment.');
      return await res.blob();
    } finally {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    }
  };

  return {
    ticket: ticket.data ?? null,
    messages: messages.data ?? [],
    attachments: attachments.data ?? [],
    isLoading: ticket.isLoading,
    error: (ticket.error ?? messages.error) as Error | null,
    reply,
    update,
    openAttachment,
    loadAttachment,
  };
}
