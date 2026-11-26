import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { profileService } from '@/services';
import type { Profile } from '@/types';

/** Saves profile changes (and an optional new photo) for the signed-in user. */
export function useUpdateProfile() {
  const { user, setProfile } = useAuth();

  return useMutation({
    mutationFn: async ({
      patch,
      avatarFile,
    }: {
      patch: Partial<Omit<Profile, 'id'>>;
      avatarFile?: File | null;
    }) => {
      if (!user) throw new Error('You need to be signed in.');
      const changes = { ...patch };
      if (avatarFile) changes.photoUrl = await profileService.uploadAvatar(user.id, avatarFile);
      return profileService.updateProfile(user.id, changes);
    },
    onSuccess: setProfile,
  });
}
