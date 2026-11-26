import type { Publication, ReadingItem, ReadingStatus } from '@/types';

export const READING_STATUS: Record<ReadingStatus, { label: string; className: string }> = {
  to_read: { label: 'To read', className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20' },
  reading: { label: 'Reading', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' },
  done: { label: 'Done', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
};

export const READING_STATUS_ORDER: ReadingStatus[] = ['to_read', 'reading', 'done'];

/** Lets reading-list items reuse the citation and BibTeX helpers built for publications. */
export const asPublication = (item: Pick<ReadingItem, 'title' | 'authors' | 'year' | 'venue' | 'doi' | 'url' | 'tags'> & { id?: string }): Publication => ({
  id: item.id ?? '',
  title: item.title,
  authors: item.authors,
  year: item.year ?? new Date().getFullYear(),
  type: 'journal',
  journal: item.venue,
  doi: item.doi,
  url: item.url,
  tags: item.tags,
});
