import { requireSupabase } from '@/lib/supabase';
import type { PublicationService } from '../types';
import { publicationFromRow, publicationToRow, type PublicationRow } from './mappers';

const friendlyError = (message: string) =>
  message.includes('publications_user_doi_key')
    ? 'You already have a publication with this DOI.'
    : message;

export const supabasePublications: PublicationService = {
  async list(userId) {
    const { data, error } = await requireSupabase()
      .from('publications')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('created_at', { ascending: false })
      .returns<PublicationRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(publicationFromRow);
  },

  async create(userId, input) {
    const { data, error } = await requireSupabase()
      .from('publications')
      .insert({ ...publicationToRow(input), user_id: userId })
      .select('*')
      .single<PublicationRow>();
    if (error) throw new Error(friendlyError(error.message));
    return publicationFromRow(data);
  },

  async createMany(userId, inputs) {
    if (inputs.length === 0) return [];
    const { data, error } = await requireSupabase()
      .from('publications')
      .insert(inputs.map(input => ({ ...publicationToRow(input), user_id: userId })))
      .select('*')
      .returns<PublicationRow[]>();
    if (error) throw new Error(friendlyError(error.message));
    return (data ?? []).map(publicationFromRow);
  },

  async update(userId, publication) {
    const { id, createdAt: _c, updatedAt: _u, ...input } = publication;
    const { data, error } = await requireSupabase()
      .from('publications')
      .update(publicationToRow(input))
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single<PublicationRow>();
    if (error) throw new Error(friendlyError(error.message));
    return publicationFromRow(data);
  },

  async remove(userId, id) {
    const { error } = await requireSupabase()
      .from('publications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },
};
