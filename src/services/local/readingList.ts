import type { ReadingItem } from '@/types';
import type { ReadingListService } from '../types';
import { keys, newId, readJson, simulateLatency, writeJson } from './storage';

const load = (userId: string) => readJson<ReadingItem[]>(keys.readingList(userId), []);
const save = (userId: string, list: ReadingItem[]) => writeJson(keys.readingList(userId), list);
const sameDoi = (a?: string, b?: string) => Boolean(a && b && a.toLowerCase() === b.toLowerCase());

export const localReadingList: ReadingListService = {
  async list(userId) {
    await simulateLatency();
    return load(userId);
  },

  async add(userId, input) {
    await simulateLatency();
    const list = load(userId);
    if (list.some(item => sameDoi(item.doi, input.doi))) throw new Error('This paper is already in your reading list.');
    const now = new Date().toISOString();
    const item: ReadingItem = { ...input, title: input.title.trim(), id: newId(), createdAt: now, updatedAt: now };
    save(userId, [item, ...list]);
    return item;
  },

  async update(userId, id, patch) {
    await simulateLatency(150);
    const list = load(userId);
    const existing = list.find(item => item.id === id);
    if (!existing) throw new Error('Item not found.');
    if (patch.doi && list.some(item => item.id !== id && sameDoi(item.doi, patch.doi))) {
      throw new Error('This paper is already in your reading list.');
    }
    const updated: ReadingItem = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    save(userId, list.map(item => (item.id === id ? updated : item)));
    return updated;
  },

  async remove(userId, id) {
    await simulateLatency(150);
    save(userId, load(userId).filter(item => item.id !== id));
  },
};
