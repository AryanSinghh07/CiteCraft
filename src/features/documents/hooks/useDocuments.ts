import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { documentService } from '@/services';
import type { DocumentRecord } from '@/types';

/** The signed-in user's stored documents, with upload / delete / open helpers. */
export function useDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ['documents', user?.id] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: () => documentService.list(user!.id),
    enabled: Boolean(user),
  });

  const upload = useMutation({
    mutationFn: ({ file, publicationId }: { file: File; publicationId?: string | null }) =>
      documentService.upload(user!.id, file, publicationId),
    onSuccess: doc =>
      queryClient.setQueryData<DocumentRecord[]>(key, old => [doc, ...(old ?? [])]),
  });

  const remove = useMutation({
    mutationFn: (doc: DocumentRecord) => documentService.remove(user!.id, doc),
    onSuccess: (_, doc) =>
      queryClient.setQueryData<DocumentRecord[]>(key, old => (old ?? []).filter(d => d.id !== doc.id)),
  });

  const open = async (doc: DocumentRecord) => {
    const url = await documentService.getFileUrl(user!.id, doc);
    // An anchor click is less likely to be popup-blocked after an await than window.open.
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
    if (url.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  /** The file itself, for the in-app viewer. */
  const load = async (doc: DocumentRecord): Promise<Blob> => {
    const url = await documentService.getFileUrl(user!.id, doc);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('This file could not be downloaded. Try again in a moment.');
      return await res.blob();
    } finally {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    }
  };

  return {
    documents: query.data ?? [],
    load,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    upload,
    remove,
    open,
  };
}
