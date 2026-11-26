import type { ClassSession, Course, GradeEntry, StudentTask } from '@/types';
import type { CollectionService, StudentService } from '../types';
import { newId, readJson, simulateLatency, writeJson } from './storage';

const key = (name: string, userId: string) => `citecraft:${name}:${userId}`;
const now = () => new Date().toISOString();

/** Generic per-user collection kept in localStorage (demo mode). */
function collection<T extends { id: string }, I>(
  name: string,
  sort: (a: T, b: T) => number,
  extra: () => Partial<T> = () => ({}),
  onRemove?: (userId: string, id: string) => void,
): CollectionService<T, I> {
  const load = (userId: string) => readJson<T[]>(key(name, userId), []);
  const save = (userId: string, list: T[]) => writeJson(key(name, userId), [...list].sort(sort));
  return {
    async list(userId) {
      await simulateLatency(120);
      return load(userId).sort(sort);
    },
    async create(userId, input) {
      await simulateLatency(120);
      const item = { ...input, ...extra(), id: newId() } as unknown as T;
      save(userId, [...load(userId), item]);
      return item;
    },
    async update(userId, id, patch) {
      await simulateLatency(80);
      const list = load(userId);
      const existing = list.find(i => i.id === id);
      if (!existing) throw new Error('Not found.');
      const updated = { ...existing, ...patch } as T;
      save(userId, list.map(i => (i.id === id ? updated : i)));
      return updated;
    },
    async remove(userId, id) {
      await simulateLatency(80);
      save(userId, load(userId).filter(i => i.id !== id));
      onRemove?.(userId, id);
    },
  };
}

export const localStudent: StudentService = {
  courses: collection<Course, Omit<Course, 'id' | 'createdAt'>>(
    'courses',
    (a, b) => a.name.localeCompare(b.name),
    () => ({ createdAt: now() }),
    // Same as the database: deleting a course removes its classes and unlinks its tasks.
    (userId, courseId) => {
      writeJson(
        key('class-sessions', userId),
        readJson<ClassSession[]>(key('class-sessions', userId), []).filter(s => s.courseId !== courseId),
      );
      writeJson(
        key('tasks', userId),
        readJson<StudentTask[]>(key('tasks', userId), []).map(t => (t.courseId === courseId ? { ...t, courseId: null } : t)),
      );
    },
  ),
  sessions: collection<ClassSession, Omit<ClassSession, 'id'>>(
    'class-sessions',
    (a, b) => a.day - b.day || a.start.localeCompare(b.start),
  ),
  tasks: collection<StudentTask, Omit<StudentTask, 'id' | 'createdAt'>>(
    'tasks',
    (a, b) => a.dueAt.localeCompare(b.dueAt),
    () => ({ createdAt: now() }),
  ),
  grades: collection<GradeEntry, Omit<GradeEntry, 'id'>>('grades', (a, b) => a.semester - b.semester),
};
