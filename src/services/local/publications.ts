import type { Publication } from '@/types';
import type { PublicationService } from '../types';
import { keys, newId, readJson, simulateLatency, writeJson } from './storage';

const load = (userId: string) => readJson<Publication[]>(keys.publications(userId), []);
const save = (userId: string, list: Publication[]) => writeJson(keys.publications(userId), list);

export const localPublications: PublicationService = {
  async list(userId) {
    await simulateLatency();
    return load(userId);
  },

  async create(userId, input) {
    await simulateLatency();
    const now = new Date().toISOString();
    const publication: Publication = { ...input, id: newId(), createdAt: now, updatedAt: now };
    save(userId, [publication, ...load(userId)]);
    return publication;
  },

  async createMany(userId, inputs) {
    await simulateLatency(400);
    const now = new Date().toISOString();
    const created: Publication[] = inputs.map(input => ({ ...input, id: newId(), createdAt: now, updatedAt: now }));
    save(userId, [...created, ...load(userId)]);
    return created;
  },

  async update(userId, publication) {
    await simulateLatency();
    const list = load(userId);
    if (!list.some(p => p.id === publication.id)) throw new Error('Publication not found.');
    const updated = { ...publication, updatedAt: new Date().toISOString() };
    save(userId, list.map(p => (p.id === updated.id ? updated : p)));
    return updated;
  },

  async remove(userId, id) {
    await simulateLatency();
    save(userId, load(userId).filter(p => p.id !== id));
  },
};
