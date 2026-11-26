import type { Profile } from '@/types';
import type { ProfileService } from '../types';
import { MAX_AVATAR_BYTES } from '../types';
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

export const localProfiles: ProfileService = {
  async getProfile(userId) {
    return readJson<Profile | null>(keys.profile(userId), null);
  },

  async updateProfile(userId, patch) {
    await simulateLatency();
    const existing = readJson<Profile | null>(keys.profile(userId), null);
    // Users can't change their own role (matches the database trigger).
    const { role: _ignored, ...safePatch } = patch;
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

  async uploadAvatar(_userId, file) {
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
    if (file.size > MAX_AVATAR_BYTES) throw new Error('Image must be 2 MB or smaller.');
    return fileToResizedDataUrl(file);
  },
};
