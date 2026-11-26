import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { publicationService } from '@/services';
import type { Publication, PublicationInput } from '@/types';

export const publicationsKey = (userId?: string) => ['publications', userId] as const;

/** Loads the signed-in user's publications and exposes create/update/delete. */
export function usePublications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = publicationsKey(user?.id);

  const query = useQuery({
    queryKey: key,
    queryFn: () => publicationService.list(user!.id),
    enabled: Boolean(user),
  });

  const setList = (update: (list: Publication[]) => Publication[]) =>
    queryClient.setQueryData<Publication[]>(key, old => update(old ?? []));

  const create = useMutation({
    mutationFn: (input: PublicationInput) => publicationService.create(user!.id, input),
    onSuccess: created => setList(list => [created, ...list]),
  });

  const createMany = useMutation({
    mutationFn: (inputs: PublicationInput[]) => publicationService.createMany(user!.id, inputs),
    onSuccess: created => setList(list => [...created, ...list]),
  });

  const update = useMutation({
    mutationFn: (publication: Publication) => publicationService.update(user!.id, publication),
    onSuccess: updated => setList(list => list.map(p => (p.id === updated.id ? updated : p))),
  });

  const remove = useMutation({
    mutationFn: (id: string) => publicationService.remove(user!.id, id),
    onSuccess: (_, id) => setList(list => list.filter(p => p.id !== id)),
  });

  return {
    publications: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    create,
    createMany,
    update,
    remove,
  };
}
