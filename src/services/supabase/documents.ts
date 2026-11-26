import { BUCKETS, requireSupabase } from '@/lib/supabase';
import type { DocumentService } from '../types';
import { MAX_DOCUMENT_BYTES } from '../types';
import { documentFromRow, type DocumentRow } from './mappers';

const safeFileName = (name: string) => name.replace(/[^\w.-]+/g, '_').slice(-120);

export const supabaseDocuments: DocumentService = {
  async list(userId) {
    const { data, error } = await requireSupabase()
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .returns<DocumentRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(documentFromRow);
  },

  async upload(userId, file, publicationId = null) {
    if (file.size > MAX_DOCUMENT_BYTES) throw new Error('Files must be 10 MB or smaller.');
    const client = requireSupabase();
    const storagePath = `${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

    const { error: uploadError } = await client.storage
      .from(BUCKETS.documents)
      .upload(storagePath, file, { contentType: file.type || undefined });
    if (uploadError) throw new Error(uploadError.message);

    const { data, error } = await client
      .from('documents')
      .insert({
        user_id: userId,
        publication_id: publicationId,
        name: file.name,
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: storagePath,
      })
      .select('*')
      .single<DocumentRow>();

    if (error) {
      // Don't leave an orphaned file behind if the metadata insert fails.
      await client.storage.from(BUCKETS.documents).remove([storagePath]);
      throw new Error(error.message);
    }
    return documentFromRow(data);
  },

  async remove(userId, doc) {
    const client = requireSupabase();
    const { error: storageError } = await client.storage
      .from(BUCKETS.documents)
      .remove([doc.storagePath]);
    if (storageError) throw new Error(storageError.message);

    const { error } = await client.from('documents').delete().eq('id', doc.id).eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  async getFileUrl(_userId, doc) {
    const { data, error } = await requireSupabase()
      .storage.from(BUCKETS.documents)
      .createSignedUrl(doc.storagePath, 60, { download: doc.name });
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },
};
