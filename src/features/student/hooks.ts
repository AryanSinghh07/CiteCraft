import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { studentService, type CollectionService } from '@/services';

/** Builds a hook for one college-tools collection (list + create / update / remove). */
function makeCollectionHook<T extends { id: string }, I>(
  name: string,
  service: () => CollectionService<T, I>,
  /** other collections to refresh after a delete (e.g. a course's classes) */
  alsoRefresh: string[] = [],
) {
  return function useCollection() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const key = ['student', name, user?.id] as const;

    const query = useQuery({
      queryKey: key,
      queryFn: () => service().list(user!.id),
      enabled: Boolean(user),
    });

    const setList = (update: (list: T[]) => T[]) => queryClient.setQueryData<T[]>(key, old => update(old ?? []));

    const create = useMutation({
      mutationFn: (input: I) => service().create(user!.id, input),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    });
    const update = useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<I> }) => service().update(user!.id, id, patch),
      onMutate: ({ id, patch }) => setList(list => list.map(item => (item.id === id ? { ...item, ...patch } : item))),
      onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
    });
    const remove = useMutation({
      mutationFn: (id: string) => service().remove(user!.id, id),
      onSuccess: (_, id) => {
        setList(list => list.filter(item => item.id !== id));
        for (const other of alsoRefresh) void queryClient.invalidateQueries({ queryKey: ['student', other] });
      },
    });

    return { items: query.data ?? [], isLoading: query.isLoading, error: query.error as Error | null, create, update, remove };
  };
}

export const useCourses = makeCollectionHook('courses', () => studentService.courses, ['sessions', 'tasks']);
export const useClassSessions = makeCollectionHook('sessions', () => studentService.sessions);
export const useTasks = makeCollectionHook('tasks', () => studentService.tasks);
export const useGrades = makeCollectionHook('grades', () => studentService.grades);
