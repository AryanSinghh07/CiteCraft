import { requireSupabase } from '@/lib/supabase';
import type { ReadingListService } from '../types';
import { readingFromRow, readingToRow, type ReadingRow } from './mappers';

const friendlyError = (message: string) =>
  message.includes('reading_list_user_doi_key') ? 'This paper is already in your reading list.' : message;

export const supabaseReadingList: ReadingListService = {
  async list(userId) {
    const { data, error } = await requireSupabase()
      .from('reading_list')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .returns<ReadingRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(readingFromRow);
  },

  async add(userId, input) {
    const { data, error } = await requireSupabase()
      .from('reading_list')
      .insert({ ...readingToRow(input), user_id: userId })
      .select('*')
      .single<ReadingRow>();
    if (error) throw new Error(friendlyError(error.message));
    return readingFromRow(data);
  },

  async update(userId, id, patch) {
    const { data, error } = await requireSupabase()
      .from('reading_list')
      .update(readingToRow(patch))
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single<ReadingRow>();
    if (error) throw new Error(friendlyError(error.message));
    return readingFromRow(data);
  },

  async remove(userId, id) {
    const { error } = await requireSupabase().from('reading_list').delete().eq('id', id).eq('user_id', userId);
    if (error) throw new Error(error.message);
  },
};
