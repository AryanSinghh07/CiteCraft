import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { aiService } from '@/services';
import type { SummaryRecord } from '@/types';

export const summariesKey = (userId?: string) => ['summaries', userId] as const;

/** Saved document summaries for the signed-in user. */
export function useSummaries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = summariesKey(user?.id);

  const query = useQuery({
    queryKey: key,
    queryFn: () => aiService.listSummaries(user!.id),
    enabled: Boolean(user) && aiService.available,
  });

  const remove = useMutation({
    mutationFn: (id: string) => aiService.deleteSummary(user!.id, id),
    onSuccess: (_, id) =>
      queryClient.setQueryData<SummaryRecord[]>(key, old => (old ?? []).filter(s => s.id !== id)),
  });

  return {
    summaries: query.data ?? [],
    isLoading: query.isLoading,
    refresh: () => queryClient.invalidateQueries({ queryKey: key }),
    remove,
  };
}
