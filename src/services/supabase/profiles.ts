import { BUCKETS, requireSupabase } from '@/lib/supabase';
import type { ProfileService } from '../types';
import { MAX_AVATAR_BYTES } from '../types';
import {
  profileFromRow,
  profileToRow,
  publicationFromRow,
  type ProfileRow,
  type PublicationRow,
} from './mappers';

const friendlyError = (message: string) =>
  message.includes('profiles_public_slug_key')
    ? 'That profile link is already taken. Try another one.'
    : message.includes('profiles_public_slug_format')
      ? 'Profile links can only use lowercase letters, numbers and hyphens (3–40 characters).'
      : message;

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
    if (error) throw new Error(friendlyError(error.message));
    return profileFromRow(data);
  },

  async getPublicProfile(slug) {
    const { data, error } = await requireSupabase().rpc('get_public_profile', { slug });
    if (error) throw new Error(error.message);
    if (!data) return null;
    const { profile, publications } = data as {
      profile: ProfileRow;
      publications: PublicationRow[];
    };
    const { id: _id, email: _email, role: _role, isPublic: _p, ...visible } = profileFromRow({
      ...profile,
      id: '',
      email: null,
    });
    return { profile: visible, publications: publications.map(publicationFromRow) };
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
