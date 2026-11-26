import type { Profile, Ticket, TicketAttachment, TicketMessage, TicketUpdate } from '@/types';
import type { TicketService } from '../types';
import { validateTicketFiles } from '../ticketFiles';
import { fileStore, keys, newId, readJson, simulateLatency, writeJson } from './storage';

/**
 * Demo-mode tickets. Mirrors the database rules in 0003_support_tickets.sql so the
 * app behaves the same with or without Supabase.
 */

const loadTickets = () => readJson<Ticket[]>(keys.tickets, []);
const saveTickets = (list: Ticket[]) => writeJson(keys.tickets, list);
const loadMessages = () => readJson<TicketMessage[]>(keys.ticketMessages, []);
const saveMessages = (list: TicketMessage[]) => writeJson(keys.ticketMessages, list);
const loadAttachments = () => readJson<TicketAttachment[]>(keys.ticketAttachments, []);
const saveAttachments = (list: TicketAttachment[]) => writeJson(keys.ticketAttachments, list);

function currentActor(): { id: string; profile: Profile | null; isAdmin: boolean } {
  const id = readJson<string | null>(keys.session, null);
  if (!id) throw new Error('You need to be signed in.');
  const profile = readJson<Profile | null>(keys.profile(id), null);
  return { id, profile, isAdmin: profile?.role === 'admin' };
}

function requireAccess(ticketId: string) {
  const actor = currentActor();
  const ticket = loadTickets().find(t => t.id === ticketId);
  if (!ticket || (!actor.isAdmin && ticket.userId !== actor.id)) throw new Error('Ticket not found.');
  return { actor, ticket };
}

function nextTicketNumber(): number {
  const next = readJson<number>(keys.ticketSeq, 1001);
  writeJson(keys.ticketSeq, next + 1);
  return next;
}

/** Applies a patch with the same timestamp/status side effects as the database trigger. */
function applyPatch(ticket: Ticket, patch: TicketUpdate): Ticket {
  const now = new Date().toISOString();
  const next: Ticket = { ...ticket, ...patch, updatedAt: now };
  if (patch.status && patch.status !== ticket.status) {
    next.resolvedAt =
      patch.status === 'resolved' ? now : patch.status === 'closed' ? ticket.resolvedAt ?? now : null;
    next.closedAt = patch.status === 'closed' ? now : null;
    if (patch.status === 'open') next.rating = null;
  }
  return next;
}

function replaceTicket(updated: Ticket) {
  saveTickets(loadTickets().map(t => (t.id === updated.id ? updated : t)));
}

async function storeAttachments(ticketId: string, files: File[], messageId: string | null) {
  const records: TicketAttachment[] = [];
  for (const file of files) {
    const id = newId();
    const storagePath = `tickets/${ticketId}/${id}`;
    await fileStore.put(storagePath, file);
    records.push({
      id,
      ticketId,
      messageId,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      storagePath,
      createdAt: new Date().toISOString(),
    });
  }
  if (records.length) saveAttachments([...loadAttachments(), ...records]);
}

const byUpdatedDesc = (a: Ticket, b: Ticket) => b.updatedAt.localeCompare(a.updatedAt);

export const localTickets: TicketService = {
  async listMine(userId) {
    await simulateLatency();
    return loadTickets().filter(t => t.userId === userId).sort(byUpdatedDesc);
  },

  async listAll() {
    await simulateLatency();
    if (!currentActor().isAdmin) throw new Error('Only support staff can view all tickets.');
    return loadTickets().sort(byUpdatedDesc);
  },

  async get(ticketId) {
    try {
      return requireAccess(ticketId).ticket;
    } catch {
      return null;
    }
  },

  async create(userId, input, files = []) {
    validateTicketFiles(files);
    await simulateLatency(400);
    const actor = currentActor();
    if (actor.id !== userId) throw new Error('You can only raise tickets for yourself.');

    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: newId(),
      ticketNumber: nextTicketNumber(),
      userId,
      requesterName: actor.profile?.name ?? '',
      requesterEmail: actor.profile?.email ?? '',
      subject: input.subject.trim(),
      description: input.description.trim(),
      category: input.category,
      priority: input.priority,
      status: 'open',
      assignedTo: null,
      rating: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      closedAt: null,
    };
    saveTickets([ticket, ...loadTickets()]);
    await storeAttachments(ticket.id, files, null);
    return ticket;
  },

  async update(ticketId, patch) {
    await simulateLatency();
    const { actor, ticket } = requireAccess(ticketId);

    if (!actor.isAdmin) {
      const staffOnly = (['priority', 'category', 'assignedTo'] as const).some(
        field => patch[field] !== undefined && patch[field] !== ticket[field],
      );
      if (staffOnly) throw new Error('Only support staff can change these ticket fields.');
      if (
        patch.status &&
        patch.status !== ticket.status &&
        !(patch.status === 'closed' || (patch.status === 'open' && ['resolved', 'closed'].includes(ticket.status)))
      ) {
        throw new Error('You can only close or reopen your ticket.');
      }
      const finalStatus = patch.status ?? ticket.status;
      if (patch.rating !== undefined && !['resolved', 'closed'].includes(finalStatus)) {
        throw new Error('Tickets can be rated once they are resolved.');
      }
    }

    const updated = applyPatch(ticket, patch);
    replaceTicket(updated);
    return updated;
  },

  async listMessages(ticketId) {
    const { actor } = requireAccess(ticketId);
    return loadMessages()
      .filter(m => m.ticketId === ticketId && (actor.isAdmin || !m.isInternal))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async addMessage(ticketId, { body, isInternal = false, files = [] }) {
    validateTicketFiles(files);
    await simulateLatency(300);
    const { actor, ticket } = requireAccess(ticketId);
    if (!actor.isAdmin && ticket.status === 'closed') {
      throw new Error('This ticket is closed. Reopen it to reply.');
    }

    const message: TicketMessage = {
      id: newId(),
      ticketId,
      authorId: actor.id,
      authorName: actor.profile?.name ?? '',
      authorRole: actor.isAdmin ? 'admin' : 'user',
      body: body.trim(),
      isInternal: actor.isAdmin && isInternal,
      createdAt: new Date().toISOString(),
    };
    saveMessages([...loadMessages(), message]);
    await storeAttachments(ticketId, files, message.id);

    // Same automatic status moves as the database trigger.
    let status = ticket.status;
    if (!message.isInternal) {
      if (message.authorRole === 'user' && ['waiting_on_user', 'resolved'].includes(status)) status = 'open';
      if (message.authorRole === 'admin' && status === 'open') status = 'in_progress';
    }
    replaceTicket(applyPatch(ticket, status !== ticket.status ? { status } : {}));
    return message;
  },

  async listAttachments(ticketId) {
    requireAccess(ticketId);
    return loadAttachments().filter(a => a.ticketId === ticketId);
  },

  async getAttachmentUrl(attachment) {
    requireAccess(attachment.ticketId);
    const blob = await fileStore.get(attachment.storagePath);
    if (!blob) throw new Error('This file is no longer available in this browser.');
    return URL.createObjectURL(blob);
  },

  async listStaff() {
    if (!currentActor().isAdmin) throw new Error('Only support staff can view the team.');
    const users = readJson<{ id: string }[]>(keys.users, []);
    return users
      .map(u => readJson<Profile | null>(keys.profile(u.id), null))
      .filter((p): p is Profile => p?.role === 'admin')
      .map(p => ({ id: p.id, name: p.name || p.email, email: p.email }));
  },
};
