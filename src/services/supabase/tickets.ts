import { BUCKETS, requireSupabase } from '@/lib/supabase';
import type { TicketUpdate } from '@/types';
import type { TicketService } from '../types';
import { validateTicketFiles } from '../ticketFiles';
import {
  ticketAttachmentFromRow,
  ticketFromRow,
  ticketMessageFromRow,
  type ProfileRow,
  type TicketAttachmentRow,
  type TicketMessageRow,
  type TicketRow,
} from './mappers';

const safeFileName = (name: string) => name.replace(/[^\w.-]+/g, '_').slice(-120);

const fail = (message: string): never => {
  throw new Error(message);
};

/** Uploads files under "<ticket id>/" and records them in ticket_attachments. */
async function uploadAttachments(ticketId: string, files: File[], messageId: string | null) {
  if (files.length === 0) return;
  const client = requireSupabase();
  const { data: auth } = await client.auth.getUser();
  const uploaderId = auth.user?.id ?? fail('You need to be signed in.');

  for (const file of files) {
    const storagePath = `${ticketId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await client.storage
      .from(BUCKETS.ticketAttachments)
      .upload(storagePath, file, { contentType: file.type || undefined });
    if (uploadError) throw new Error(`Could not upload ${file.name}: ${uploadError.message}`);

    const { error } = await client.from('ticket_attachments').insert({
      ticket_id: ticketId,
      message_id: messageId,
      uploaded_by: uploaderId,
      name: file.name,
      size_bytes: file.size,
      mime_type: file.type || 'application/octet-stream',
      storage_path: storagePath,
    });
    if (error) {
      await client.storage.from(BUCKETS.ticketAttachments).remove([storagePath]);
      throw new Error(error.message);
    }
  }
}

const toRowPatch = (patch: TicketUpdate) => {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.assignedTo !== undefined) row.assigned_to = patch.assignedTo;
  if (patch.rating !== undefined) row.rating = patch.rating;
  return row;
};

export const supabaseTickets: TicketService = {
  async listMine(userId) {
    const { data, error } = await requireSupabase()
      .from('tickets')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .returns<TicketRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(ticketFromRow);
  },

  async listAll() {
    const { data, error } = await requireSupabase()
      .from('tickets')
      .select('*')
      .order('updated_at', { ascending: false })
      .returns<TicketRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(ticketFromRow);
  },

  async get(ticketId) {
    const { data, error } = await requireSupabase()
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle<TicketRow>();
    if (error) throw new Error(error.message);
    return data ? ticketFromRow(data) : null;
  },

  async create(userId, input, files = []) {
    validateTicketFiles(files);
    const { data, error } = await requireSupabase()
      .from('tickets')
      .insert({
        user_id: userId,
        subject: input.subject.trim(),
        description: input.description.trim(),
        category: input.category,
        priority: input.priority,
      })
      .select('*')
      .single<TicketRow>();
    if (error) throw new Error(error.message);
    await uploadAttachments(data.id, files, null);
    return ticketFromRow(data);
  },

  async update(ticketId, patch) {
    const { data, error } = await requireSupabase()
      .from('tickets')
      .update(toRowPatch(patch))
      .eq('id', ticketId)
      .select('*')
      .single<TicketRow>();
    if (error) throw new Error(error.message);
    return ticketFromRow(data);
  },

  async listMessages(ticketId) {
    const { data, error } = await requireSupabase()
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .returns<TicketMessageRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(ticketMessageFromRow);
  },

  async addMessage(ticketId, { body, isInternal = false, files = [] }) {
    validateTicketFiles(files);
    const client = requireSupabase();
    const { data: auth } = await client.auth.getUser();
    const authorId = auth.user?.id ?? fail('You need to be signed in.');

    const { data, error } = await client
      .from('ticket_messages')
      .insert({ ticket_id: ticketId, author_id: authorId, body: body.trim(), is_internal: isInternal })
      .select('*')
      .single<TicketMessageRow>();
    if (error) throw new Error(error.message);
    await uploadAttachments(ticketId, files, data.id);
    return ticketMessageFromRow(data);
  },

  async listAttachments(ticketId) {
    const { data, error } = await requireSupabase()
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .returns<TicketAttachmentRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(ticketAttachmentFromRow);
  },

  async getAttachmentUrl(attachment) {
    const { data, error } = await requireSupabase()
      .storage.from(BUCKETS.ticketAttachments)
      .createSignedUrl(attachment.storagePath, 60);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },

  async listStaff() {
    const { data, error } = await requireSupabase()
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'admin')
      .order('full_name')
      .returns<Pick<ProfileRow, 'id' | 'full_name' | 'email'>[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => ({ id: r.id, name: r.full_name || r.email || 'Admin', email: r.email ?? '' }));
  },
};
