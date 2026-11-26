import type { DocumentRecord } from '@/types';
import type { DocumentService } from '../types';
import { MAX_DOCUMENT_BYTES } from '../types';
import { fileStore, keys, newId, readJson, simulateLatency, writeJson } from './storage';

const load = (userId: string) => readJson<DocumentRecord[]>(keys.documents(userId), []);
const save = (userId: string, list: DocumentRecord[]) => writeJson(keys.documents(userId), list);

export const localDocuments: DocumentService = {
  async list(userId) {
    return load(userId);
  },

  async upload(userId, file, publicationId = null) {
    if (file.size > MAX_DOCUMENT_BYTES) throw new Error('Files must be 10 MB or smaller.');
    await simulateLatency(400);
    const id = newId();
    const storagePath = `${userId}/${id}`;
    await fileStore.put(storagePath, file);

    const record: DocumentRecord = {
      id,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      publicationId,
      storagePath,
      createdAt: new Date().toISOString(),
    };
    save(userId, [record, ...load(userId)]);
    return record;
  },

  async remove(userId, doc) {
    await fileStore.delete(doc.storagePath);
    save(userId, load(userId).filter(d => d.id !== doc.id));
  },

  async getFileUrl(_userId, doc) {
    const blob = await fileStore.get(doc.storagePath);
    if (!blob) throw new Error('This file is no longer available in this browser.');
    return URL.createObjectURL(blob);
  },
};
