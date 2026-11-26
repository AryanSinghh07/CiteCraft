import { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import type { Publication, PublicationInput } from '@/types';
import { AlertTriangle, FileUp, Loader2, Search, Upload } from 'lucide-react';
import { parseBibtex } from '../utils/bibtex';
import { lookupDoi, normalizeDoi, partitionDuplicates } from '../utils/doi';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: Publication[];
  onImport: (inputs: PublicationInput[]) => Promise<void>;
  isImporting: boolean;
}

interface Candidate {
  input: PublicationInput;
  duplicate: boolean;
  selected: boolean;
}

const MAX_DOIS = 50;
const MAX_BIB_BYTES = 2 * 1024 * 1024;

const ImportDialog = ({ open, onOpenChange, existing, onImport, isImporting }: ImportDialogProps) => {
  const [tab, setTab] = useState<'doi' | 'bibtex'>('doi');
  const [doiText, setDoiText] = useState('');
  const [bibText, setBibText] = useState('');
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = () => {
    abortRef.current?.abort();
    setCandidates(null);
    setProblems([]);
    setProgress(null);
  };

  const close = (next: boolean) => {
    if (!next) {
      reset();
      setDoiText('');
      setBibText('');
    }
    onOpenChange(next);
  };

  const buildCandidates = (inputs: PublicationInput[]) => {
    const { duplicates } = partitionDuplicates(inputs, existing);
    const dupSet = new Set(duplicates);
    setCandidates(inputs.map(input => ({ input, duplicate: dupSet.has(input), selected: !dupSet.has(input) })));
  };

  const handleDoiLookup = async () => {
    const lines = doiText.split(/[\s,]+/).filter(Boolean);
    const dois = [...new Set(lines.map(normalizeDoi).filter((d): d is string => Boolean(d)))];
    const invalid = lines.filter(l => !normalizeDoi(l));
    if (dois.length === 0) {
      toast({ title: 'No DOIs found', description: 'Paste one DOI per line, e.g. 10.1038/nature14539', variant: 'destructive' });
      return;
    }
    if (dois.length > MAX_DOIS) {
      toast({ title: 'Too many DOIs', description: `Import up to ${MAX_DOIS} at a time.`, variant: 'destructive' });
      return;
    }

    reset();
    const controller = new AbortController();
    abortRef.current = controller;
    const found: PublicationInput[] = [];
    const errors = invalid.map(l => `“${l}” is not a DOI`);
    setProgress({ done: 0, total: dois.length });

    for (const [i, doi] of dois.entries()) {
      try {
        found.push(await lookupDoi(doi, controller.signal));
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        errors.push((error as Error).message);
      }
      setProgress({ done: i + 1, total: dois.length });
    }
    setProgress(null);
    setProblems(errors);
    buildCandidates(found);
  };

  const handleBibParse = (text = bibText) => {
    reset();
    const { publications, skipped } = parseBibtex(text);
    setProblems(skipped.map(s => `${s.key || 'entry'}: ${s.reason}`));
    if (publications.length === 0) {
      toast({ title: 'Nothing to import', description: 'No valid BibTeX entries were found.', variant: 'destructive' });
      return;
    }
    buildCandidates(publications);
  };

  const handleBibFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BIB_BYTES) {
      toast({ title: 'File too large', description: 'BibTeX files must be 2 MB or smaller.', variant: 'destructive' });
      return;
    }
    const text = await file.text();
    setBibText(text);
    handleBibParse(text);
  };

  const selected = useMemo(() => candidates?.filter(c => c.selected) ?? [], [candidates]);

  const toggle = (index: number, value: boolean) =>
    setCandidates(prev => prev?.map((c, i) => (i === index ? { ...c, selected: value } : c)) ?? null);

  const handleImport = async () => {
    try {
      await onImport(selected.map(c => c.input));
      close(false);
    } catch {
      // the caller shows the error; keep the preview open
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import publications</DialogTitle>
          <DialogDescription>Add papers in bulk from DOIs or a BibTeX file (Google Scholar, Zotero, Mendeley…).</DialogDescription>
        </DialogHeader>

        {!candidates ? (
          <Tabs value={tab} onValueChange={v => setTab(v as 'doi' | 'bibtex')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="doi">From DOIs</TabsTrigger>
              <TabsTrigger value="bibtex">From BibTeX</TabsTrigger>
            </TabsList>

            <TabsContent value="doi" className="space-y-3 pt-2">
              <Textarea
                value={doiText}
                onChange={e => setDoiText(e.target.value)}
                rows={6}
                placeholder={'One DOI per line, e.g.\n10.1038/nature14539\nhttps://doi.org/10.1145/3292500.3330701'}
                className="font-mono text-sm"
                disabled={Boolean(progress)}
              />
              {progress && (
                <div className="space-y-1">
                  <Progress value={(progress.done / progress.total) * 100} />
                  <p className="text-xs text-muted-foreground">
                    Looking up {progress.done} of {progress.total}…
                  </p>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleDoiLookup} disabled={!doiText.trim() || Boolean(progress)}>
                  {progress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Look up
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Details and citation counts come from Crossref.</p>
            </TabsContent>

            <TabsContent value="bibtex" className="space-y-3 pt-2">
              <Textarea
                value={bibText}
                onChange={e => setBibText(e.target.value)}
                rows={8}
                placeholder={'@article{key,\n  title = {…},\n  author = {Last, First and …},\n  year = {2024}\n}'}
                className="font-mono text-xs"
              />
              <input ref={fileRef} type="file" accept=".bib,.bibtex,.txt,text/plain" className="hidden" onChange={handleBibFile} />
              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload .bib file
                </Button>
                <Button onClick={() => handleBibParse()} disabled={!bibText.trim()}>
                  <FileUp className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {candidates.length} found · {selected.length} selected
              </span>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={reset}>
                Start over
              </Button>
            </div>

            {problems.length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
                <p className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> {problems.length} could not be imported
                </p>
                <ul className="list-disc pl-5 text-muted-foreground max-h-24 overflow-y-auto">
                  {problems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            <ul className="divide-y rounded-md border max-h-[45vh] overflow-y-auto">
              {candidates.map((c, i) => (
                <li key={i} className="flex gap-3 p-3">
                  <Checkbox
                    id={`import-${i}`}
                    checked={c.selected}
                    onCheckedChange={v => toggle(i, v === true)}
                    className="mt-1"
                  />
                  <label htmlFor={`import-${i}`} className="min-w-0 flex-1 cursor-pointer space-y-0.5">
                    <p className="text-sm font-medium leading-snug">{c.input.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.input.authors.slice(0, 4).join(', ')}
                      {c.input.authors.length > 4 ? ' et al.' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[c.input.journal || c.input.conference || c.input.book, c.input.year].filter(Boolean).join(' · ')}
                    </p>
                    {c.duplicate && (
                      <span className="inline-block text-[11px] rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5">
                        Already in your library
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {candidates && (
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={selected.length === 0 || isImporting}>
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {selected.length} {selected.length === 1 ? 'publication' : 'publications'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
