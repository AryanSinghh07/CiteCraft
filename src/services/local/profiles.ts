import type { Profile, Publication } from '@/types';
import type { ProfileService } from '../types';
import { MAX_AVATAR_BYTES, PUBLIC_SLUG_PATTERN } from '../types';
import { keys, readJson, simulateLatency, writeJson } from './storage';

/** Downscales an image so it fits comfortably in localStorage. */
function fileToResizedDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}

const allProfiles = (): Profile[] =>
  readJson<{ id: string }[]>(keys.users, [])
    .map(u => readJson<Profile | null>(keys.profile(u.id), null))
    .filter((p): p is Profile => Boolean(p));

export const localProfiles: ProfileService = {
  async getProfile(userId) {
    return readJson<Profile | null>(keys.profile(userId), null);
  },

  async updateProfile(userId, patch) {
    await simulateLatency();
    const existing = readJson<Profile | null>(keys.profile(userId), null);
    // Users can't change their own role (matches the database trigger).
    const { role: _ignored, ...safePatch } = patch;
    if (safePatch.publicSlug !== undefined) {
      const slug = safePatch.publicSlug.trim().toLowerCase();
      if (slug && !PUBLIC_SLUG_PATTERN.test(slug)) {
        throw new Error('Profile links can only use lowercase letters, numbers and hyphens (3–40 characters).');
      }
      const takenBy = allProfiles().find(p => p.publicSlug === slug && p.id !== userId);
      if (slug && takenBy) throw new Error('That profile link is already taken. Try another one.');
      safePatch.publicSlug = slug || undefined;
    }
    const updated: Profile = {
      name: '',
      email: '',
      affiliation: '',
      position: '',
      department: '',
      ...existing,
      ...safePatch,
      id: userId,
    };
    writeJson(keys.profile(userId), updated);
    return updated;
  },

  async getPublicProfile(slug) {
    await simulateLatency();
    const profile = allProfiles().find(p => p.isPublic && p.publicSlug === slug.toLowerCase());
    if (!profile) return null;
    const { id, email: _e, role: _r, isPublic: _p, ...visible } = profile;
    const publications = readJson<Publication[]>(keys.publications(id), []).sort((a, b) => b.year - a.year);
    return { profile: visible, publications };
  },

  async uploadAvatar(_userId, file) {
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
    if (file.size > MAX_AVATAR_BYTES) throw new Error('Image must be 2 MB or smaller.');
    return fileToResizedDataUrl(file);
  },
};
