import { BUCKETS, requireSupabase } from '@/lib/supabase';
import type { ProfileService } from '../types';
import { MAX_AVATAR_BYTES } from '../types';
import { profileFromRow, profileToRow, type ProfileRow } from './mappers';

export const supabaseProfiles: ProfileService = {
  async getProfile(userId) {
    const { data, error } = await requireSupabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle<ProfileRow>();
    if (error) throw new Error(error.message);
    return data ? profileFromRow(data) : null;
  },

  async updateProfile(userId, patch) {
    const { data, error } = await requireSupabase()
      .from('profiles')
      .update(profileToRow(patch))
      .eq('id', userId)
      .select('*')
      .single<ProfileRow>();
    if (error) throw new Error(error.message);
    return profileFromRow(data);
  },

  async uploadAvatar(userId, file) {
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
    if (file.size > MAX_AVATAR_BYTES) throw new Error('Image must be 2 MB or smaller.');

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    // Files live under a folder named after the user id (enforced by storage policies).
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const storage = requireSupabase().storage.from(BUCKETS.avatars);

    const { error } = await storage.upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(error.message);
    return storage.getPublicUrl(path).data.publicUrl;
  },
};
