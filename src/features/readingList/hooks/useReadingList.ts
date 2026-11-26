import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { readingListService } from '@/services';
import type { ReadingItem, ReadingItemInput } from '@/types';

export const readingListKey = (userId?: string) => ['reading-list', userId] as const;

/** Papers the user is reading, with status and notes. */
export function useReadingList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = readingListKey(user?.id);

  const query = useQuery({
    queryKey: key,
    queryFn: () => readingListService.list(user!.id),
    enabled: Boolean(user),
  });

  const setList = (update: (list: ReadingItem[]) => ReadingItem[]) =>
    queryClient.setQueryData<ReadingItem[]>(key, old => update(old ?? []));

  const add = useMutation({
    mutationFn: (input: ReadingItemInput) => readingListService.add(user!.id, input),
    onSuccess: item => setList(list => [item, ...list]),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ReadingItemInput> }) =>
      readingListService.update(user!.id, id, patch),
    onSuccess: item => setList(list => list.map(i => (i.id === item.id ? item : i))),
  });

  const remove = useMutation({
    mutationFn: (id: string) => readingListService.remove(user!.id, id),
    onSuccess: (_, id) => setList(list => list.filter(i => i.id !== id)),
  });

  return { items: query.data ?? [], isLoading: query.isLoading, error: query.error as Error | null, add, update, remove };
}
