import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { lookupDoi } from '@/features/publications/utils/doi';
import { CITATION_STYLES, formatCitation, type CitationStyle } from '@/features/publications/utils/citations';
import { PUBLICATION_TYPES, PUBLICATION_TYPE_ORDER, venueOf } from '@/features/publications/utils/publicationTypes';
import { readingListService } from '@/services';
import type { Publication, PublicationType } from '@/types';
import { BookMarked, Check, Copy, Loader2, Quote, Search, Trash2 } from 'lucide-react';

const HISTORY_KEY = 'citecraft:cite-history';
const STYLES = Object.keys(CITATION_STYLES) as CitationStyle[];

function loadHistory(): Publication[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as Publication[];
  } catch {
    return [];
  }
}

/** Free citation generator — works without an account. */
const Cite = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [doi, setDoi] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [style, setStyle] = useState<CitationStyle>('apa');
  const [current, setCurrent] = useState<Publication | null>(null);
  const [history, setHistory] = useState<Publication[]>(loadHistory);
  const [copied, setCopied] = useState<string | null>(null);
  const [manual, setManual] = useState({ title: '', authors: '', year: String(new Date().getFullYear()), venue: '', type: 'journal' as PublicationType, url: '' });

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
    } catch {
      /* private mode — history just isn't kept */
    }
  }, [history]);

  const remember = (pub: Publication) => {
    setCurrent(pub);
    setHistory(prev => [pub, ...prev.filter(p => p.id !== pub.id && (p.doi ? p.doi !== pub.doi : p.title !== pub.title))].slice(0, 20));
  };

  const findDoi = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!doi.trim()) return;
    setIsLookingUp(true);
    try {
      const found = await lookupDoi(doi);
      remember({ ...found, id: crypto.randomUUID() });
    } catch (error) {
      toast({ title: 'Not found', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setIsLookingUp(false);
    }
  };

  const fromManual = (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(manual.year, 10);
    const venue = manual.venue.trim() || undefined;
    remember({
      id: crypto.randomUUID(),
      title: manual.title.trim(),
      authors: manual.authors.split(/[,;]| and /).map(a => a.trim()).filter(Boolean),
      year: Number.isFinite(year) ? year : new Date().getFullYear(),
      type: manual.type,
      journal: manual.type === 'journal' ? venue : undefined,
      conference: manual.type === 'conference' ? venue : undefined,
      book: manual.type === 'book' || manual.type === 'chapter' ? venue : undefined,
      venue: ['journal', 'conference', 'book', 'chapter'].includes(manual.type) ? undefined : venue,
      url: manual.url.trim() || undefined,
    });
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const saveToReadingList = async (pub: Publication) => {
    if (!user) return;
    try {
      await readingListService.add(user.id, {
        title: pub.title,
        authors: pub.authors,
        year: pub.year,
        venue: venueOf(pub) || undefined,
        doi: pub.doi,
        url: pub.url,
        status: 'to_read',
        tags: pub.tags ?? [],
      });
      toast({ title: 'Saved to your reading list' });
    } catch (error) {
      toast({ title: 'Could not save', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    }
  };

  const citations = useMemo(() => (current ? STYLES.map(s => ({ style: s, text: formatCitation(current, s) })) : []), [current]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <header className="text-center mb-10 animate-fade-up">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Quote className="h-7 w-7" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Free citation generator</h1>
            <p className="mt-2 text-muted-foreground">
              APA, MLA, IEEE, Harvard and Chicago — from a DOI or details you type. No sign-up needed.
            </p>
          </header>

          <div className="rounded-2xl border bg-card p-4 sm:p-6 shadow-sm animate-fade-up [animation-delay:80ms]">
            <Tabs defaultValue="doi">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="doi">From a DOI</TabsTrigger>
                <TabsTrigger value="manual">Enter details</TabsTrigger>
              </TabsList>
              <TabsContent value="doi" className="pt-4">
                <form onSubmit={findDoi} className="flex gap-2">
                  <Input
                    value={doi}
                    onChange={e => setDoi(e.target.value)}
                    placeholder="Paste a DOI, e.g. 10.1038/nature14539"
                    aria-label="DOI"
                    disabled={isLookingUp}
                  />
                  <Button type="submit" disabled={!doi.trim() || isLookingUp}>
                    {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span className="ml-2 hidden sm:inline">Cite</span>
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="manual" className="pt-4">
                <form onSubmit={fromManual} className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="c-title">Title *</Label>
                    <Input id="c-title" required value={manual.title} onChange={e => setManual(m => ({ ...m, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="c-authors">Authors</Label>
                    <Input id="c-authors" value={manual.authors} onChange={e => setManual(m => ({ ...m, authors: e.target.value }))} placeholder="e.g. Ada Lovelace, Alan Turing" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={manual.type} onValueChange={v => setManual(m => ({ ...m, type: v as PublicationType }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PUBLICATION_TYPE_ORDER.map(t => (
                          <SelectItem key={t} value={t}>
                            {PUBLICATION_TYPES[t].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-year">Year</Label>
                    <Input id="c-year" type="number" min={1500} max={2100} value={manual.year} onChange={e => setManual(m => ({ ...m, year: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-venue">{PUBLICATION_TYPES[manual.type].venueLabel}</Label>
                    <Input id="c-venue" value={manual.venue} onChange={e => setManual(m => ({ ...m, venue: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-url">Link</Label>
                    <Input id="c-url" type="url" value={manual.url} onChange={e => setManual(m => ({ ...m, url: e.target.value }))} placeholder="https://" />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <Button type="submit">
                      <Quote className="mr-2 h-4 w-4" /> Create citation
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          {current && (
            <section className="mt-8 space-y-3 animate-fade-up" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold truncate">{current.title}</h2>
                {user && (
                  <Button variant="outline" size="sm" onClick={() => saveToReadingList(current)}>
                    <BookMarked className="mr-2 h-4 w-4" /> Save to reading list
                  </Button>
                )}
              </div>
              {citations.map(({ style: s, text }) => (
                <div
                  key={s}
                  className={cn('group rounded-xl border bg-card p-4 transition-colors', s === style && 'border-primary/50 ring-1 ring-primary/20')}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{CITATION_STYLES[s]}</span>
                    <Button size="sm" variant="ghost" onClick={() => copy(text, s)} className="h-8">
                      {copied === s ? <Check className="mr-1.5 h-4 w-4 text-emerald-500" /> : <Copy className="mr-1.5 h-4 w-4" />}
                      {copied === s ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed select-all">{text}</p>
                </div>
              ))}
            </section>
          )}

          {history.length > 0 && (
            <section className="mt-12">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Your recent citations</h2>
                <div className="flex items-center gap-2">
                  <Select value={style} onValueChange={v => setStyle(v as CitationStyle)}>
                    <SelectTrigger className="h-9 w-[170px]" aria-label="Style for the list">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map(s => (
                        <SelectItem key={s} value={s}>
                          {CITATION_STYLES[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copy(
                        history
                          .map(p => formatCitation(p, style))
                          .sort((a, b) => a.localeCompare(b))
                          .join('\n\n'),
                        'all',
                      )
                    }
                  >
                    {copied === 'all' ? <Check className="mr-1.5 h-4 w-4 text-emerald-500" /> : <Copy className="mr-1.5 h-4 w-4" />}
                    Copy all
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setHistory([])} aria-label="Clear history">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ol className="space-y-2">
                {history.map(p => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setCurrent(p)}
                      className="w-full rounded-lg border bg-card p-3 text-left text-sm hover:border-primary/40 transition-colors"
                    >
                      {formatCitation(p, style)}
                    </button>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-muted-foreground">Kept in this browser only.</p>
            </section>
          )}

          {!user && (
            <div className="mt-12 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 border p-6 text-center">
              <p className="font-semibold">Keep a reading list, track your projects and build your academic CV</p>
              <p className="text-sm text-muted-foreground mt-1">Free for students and researchers.</p>
              <Button asChild className="mt-4">
                <Link to="/signup?type=student">Create a free student account</Link>
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Cite;
