import { useMemo, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import CiteMenu from '@/features/publications/components/CiteMenu';
import { lookupDoi } from '@/features/publications/utils/doi';
import { venueOf } from '@/features/publications/utils/publicationTypes';
import { toBibtex } from '@/features/publications/utils/bibtex';
import { downloadFile } from '@/features/publications/utils/exporters';
import { useReadingList } from '@/features/readingList/hooks/useReadingList';
import { READING_STATUS, READING_STATUS_ORDER, asPublication } from '@/features/readingList/utils';
import { safeUrl } from '@/utils/safeUrl';
import type { ReadingItem, ReadingStatus } from '@/types';
import {
  BookMarked,
  Braces,
  ChevronDown,
  ExternalLink,
  Loader2,
  NotebookPen,
  Plus,
  Search,
  Trash2,
  Wand2,
} from 'lucide-react';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

type Filter = 'all' | ReadingStatus;

const ReadingItemCard = ({
  item,
  onStatus,
  onNotes,
  onDelete,
}: {
  item: ReadingItem;
  onStatus: (status: ReadingStatus) => void;
  onNotes: (notes: string) => void;
  onDelete: () => void;
}) => {
  const [showNotes, setShowNotes] = useState(Boolean(item.notes));
  const [notes, setNotes] = useState(item.notes ?? '');
  const link = item.doi ? `https://doi.org/${item.doi}` : safeUrl(item.url);

  return (
    <li className="rounded-xl border bg-card p-4 shadow-sm hover-lift animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium leading-snug">{item.title}</p>
          {item.authors.length > 0 && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {item.authors.slice(0, 5).join(', ')}
              {item.authors.length > 5 ? ' et al.' : ''}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{[item.venue, item.year].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Select value={item.status} onValueChange={v => onStatus(v as ReadingStatus)}>
            <SelectTrigger
              className={cn('h-8 w-[112px] rounded-full border text-xs font-medium', READING_STATUS[item.status].className)}
              aria-label="Reading status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {READING_STATUS_ORDER.map(s => (
                <SelectItem key={s} value={s}>
                  {READING_STATUS[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CiteMenu publication={asPublication(item)} />
          {link && (
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-primary">
              <a href={link} target="_blank" rel="noopener noreferrer" aria-label="Open paper">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotes(v => !v)}
            className={cn('text-muted-foreground hover:text-primary', showNotes && 'text-primary')}
            aria-label="Notes"
            aria-expanded={showNotes}
          >
            <NotebookPen className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {showNotes && (
        <div className="mt-3 animate-fade-in">
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => notes !== (item.notes ?? '') && onNotes(notes)}
            rows={3}
            maxLength={10000}
            placeholder="Your notes: key ideas, quotes, how you'll use it… (saved when you click away)"
            className="text-sm"
          />
        </div>
      )}
    </li>
  );
};

const ReadingList = () => {
  const { items, isLoading, add, update, remove } = useReadingList();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [doi, setDoi] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ title: '', authors: '', year: '', venue: '', url: '' });

  const counts = useMemo(
    () => Object.fromEntries(READING_STATUS_ORDER.map(s => [s, items.filter(i => i.status === s).length])) as Record<ReadingStatus, number>,
    [items],
  );
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      i =>
        (filter === 'all' || i.status === filter) &&
        (!q || [i.title, i.venue, ...i.authors, ...(i.tags ?? [])].some(v => v?.toLowerCase().includes(q))),
    );
  }, [items, filter, search]);

  const addByDoi = async () => {
    if (!doi.trim()) return;
    setIsLookingUp(true);
    try {
      const found = await lookupDoi(doi);
      await add.mutateAsync({
        title: found.title,
        authors: found.authors,
        year: found.year,
        venue: venueOf(found),
        doi: found.doi,
        url: found.url,
        status: 'to_read',
        tags: found.tags ?? [],
      });
      setDoi('');
      toast({ title: 'Added to your reading list', description: found.title });
    } catch (error) {
      toast({ title: 'Could not add paper', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setIsLookingUp(false);
    }
  };

  const addManually = async (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(manual.year, 10);
    try {
      await add.mutateAsync({
        title: manual.title,
        authors: manual.authors.split(/[,;]| and /).map(a => a.trim()).filter(Boolean),
        year: Number.isFinite(year) ? year : undefined,
        venue: manual.venue || undefined,
        url: safeUrl(manual.url),
        status: 'to_read',
        tags: [],
      });
      setManual({ title: '', authors: '', year: '', venue: '', url: '' });
      setManualOpen(false);
      toast({ title: 'Added to your reading list' });
    } catch (error) {
      toast({ title: 'Could not add paper', description: errorMessage(error), variant: 'destructive' });
    }
  };

  const patch = async (id: string, change: Parameters<typeof update.mutateAsync>[0]['patch'], message?: string) => {
    try {
      await update.mutateAsync({ id, patch: change });
      if (message) toast({ title: message });
    } catch (error) {
      toast({ title: 'Could not save', description: errorMessage(error), variant: 'destructive' });
    }
  };

  const exportBib = () => {
    downloadFile('citecraft-reading-list.bib', toBibtex(visible.map(asPublication)), 'application/x-bibtex;charset=utf-8');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-up">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookMarked className="h-7 w-7 text-primary" /> Reading list
              </h1>
              <p className="text-muted-foreground">Keep track of papers you're reading, with notes and ready-made citations.</p>
            </div>
            <Button variant="outline" onClick={exportBib} disabled={visible.length === 0}>
              <Braces className="mr-2 h-4 w-4" /> Export BibTeX
            </Button>
          </header>

          <section className="mb-8 rounded-2xl border bg-card p-4 sm:p-5 shadow-sm animate-fade-up [animation-delay:80ms]">
            <Label htmlFor="rl-doi" className="flex items-center gap-1.5 mb-2">
              <Wand2 className="h-4 w-4 text-primary" /> Add a paper by DOI
            </Label>
            <div className="flex gap-2">
              <Input
                id="rl-doi"
                value={doi}
                onChange={e => setDoi(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), void addByDoi())}
                placeholder="10.1038/nature14539 or a doi.org link"
                disabled={isLookingUp}
              />
              <Button onClick={addByDoi} disabled={!doi.trim() || isLookingUp}>
                {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Add</span>
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setManualOpen(o => !o)}
              className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              aria-expanded={manualOpen}
            >
              No DOI? Add it manually
              <ChevronDown className={cn('h-4 w-4 transition-transform', manualOpen && 'rotate-180')} />
            </button>
            {manualOpen && (
              <form onSubmit={addManually} className="mt-4 grid gap-3 sm:grid-cols-2 animate-fade-in">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="rl-title">Title *</Label>
                  <Input id="rl-title" value={manual.title} onChange={e => setManual(m => ({ ...m, title: e.target.value }))} required maxLength={500} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="rl-authors">Authors</Label>
                  <Input id="rl-authors" value={manual.authors} onChange={e => setManual(m => ({ ...m, authors: e.target.value }))} placeholder="Separate names with commas" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rl-year">Year</Label>
                  <Input id="rl-year" type="number" min={1500} max={2100} value={manual.year} onChange={e => setManual(m => ({ ...m, year: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rl-venue">Journal / source</Label>
                  <Input id="rl-venue" value={manual.venue} onChange={e => setManual(m => ({ ...m, venue: e.target.value }))} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="rl-url">Link</Label>
                  <Input id="rl-url" type="url" value={manual.url} onChange={e => setManual(m => ({ ...m, url: e.target.value }))} placeholder="https://" />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={add.isPending}>
                    {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add to list
                  </Button>
                </div>
              </form>
            )}
          </section>

          <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={v => setFilter(v as Filter)}>
              <TabsList className="h-auto flex-wrap">
                <TabsTrigger value="all">All ({items.length})</TabsTrigger>
                {READING_STATUS_ORDER.map(s => (
                  <TabsTrigger key={s} value={s}>
                    {READING_STATUS[s].label} ({counts[s]})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="pl-9" aria-label="Search reading list" />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
              <BookMarked className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                {items.length === 0 ? 'Your reading list is empty. Paste a DOI above to add your first paper.' : 'Nothing matches this filter.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map(item => (
                <ReadingItemCard
                  key={item.id}
                  item={item}
                  onStatus={status => patch(item.id, { status }, `Marked as “${READING_STATUS[status].label}”`)}
                  onNotes={notes => patch(item.id, { notes }, 'Notes saved')}
                  onDelete={async () => {
                    try {
                      await remove.mutateAsync(item.id);
                      toast({ title: 'Removed from reading list' });
                    } catch (error) {
                      toast({ title: 'Could not remove', description: errorMessage(error), variant: 'destructive' });
                    }
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ReadingList;
