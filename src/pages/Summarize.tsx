import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Markdown from '@/components/common/Markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { aiService, documentService } from '@/services';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSummaries } from '@/features/summarizer/hooks/useSummaries';
import {
  ACCEPTED_EXTENSIONS,
  MAX_SUMMARY_FILE_BYTES,
  SUPPORTED_LABEL,
  readDocument,
  readDocumentText,
} from '@/features/summarizer/utils/readDocument';
import { quickSummary } from '@/features/summarizer/utils/quickSummary';
import { isSetupError } from '@/utils/errors';
import type { DocumentRecord, SummaryFocus, SummaryLength, SummaryRecord } from '@/types';
import {
  Check,
  Copy,
  Download,
  FileText,
  History,
  Info,
  Loader2,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react';

const FOCUS_OPTIONS: { value: SummaryFocus; label: string }[] = [
  { value: 'general', label: 'General overview' },
  { value: 'key_findings', label: 'Key findings & results' },
  { value: 'methods', label: 'Methods & approach' },
  { value: 'literature', label: 'Literature review note' },
  { value: 'action_items', label: 'Decisions & action items' },
  { value: 'simple', label: 'Plain language' },
  { value: 'slides', label: 'Slide bullet points' },
];
const FOCUS_LABEL = Object.fromEntries(FOCUS_OPTIONS.map(f => [f.value, f.label])) as Record<SummaryFocus, string>;
const LANGUAGES = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Chinese', 'Japanese', 'Arabic', 'Bengali', 'Tamil', 'Marathi'];

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

type Status = 'idle' | 'reading' | 'streaming' | 'done' | 'error';
type Engine = 'ai' | 'quick';

const ENGINE_KEY = 'citecraft:summary-engine';
const savedEngine = (): Engine => {
  try {
    return localStorage.getItem(ENGINE_KEY) === 'quick' ? 'quick' : 'ai';
  } catch {
    return 'ai';
  }
};

const Summarize = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { summaries, isLoading: historyLoading, refresh, remove } = useSummaries();

  const [file, setFile] = useState<File | null>(null);
  const [length, setLength] = useState<SummaryLength>('standard');
  const [focus, setFocus] = useState<SummaryFocus>('general');
  const [language, setLanguage] = useState('English');
  const [status, setStatus] = useState<Status>('idle');
  const [output, setOutput] = useState('');
  const [outputTitle, setOutputTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SummaryRecord | null>(null);
  // AI when the server supports it; otherwise (or by choice) the free in-browser quick summary.
  const [engine, setEngineState] = useState<Engine>(() => (aiService.available ? savedEngine() : 'quick'));
  const [aiMissing, setAiMissing] = useState(!aiService.available);
  const setEngine = (next: Engine) => {
    setEngineState(next);
    try {
      localStorage.setItem(ENGINE_KEY, next);
    } catch {
      /* ignore */
    }
  };
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const busy = status === 'reading' || status === 'streaming';

  const pickFile = useCallback(
    (candidate: File | undefined | null) => {
      if (!candidate) return;
      if (candidate.size > MAX_SUMMARY_FILE_BYTES) {
        toast({ title: 'File too large', description: 'Files must be 10 MB or smaller.', variant: 'destructive' });
        return;
      }
      setFile(candidate);
    },
    [toast],
  );

  // Opened from the document library: load that stored file.
  useEffect(() => {
    const state = location.state as { document?: DocumentRecord; file?: File } | null;
    if (state?.file instanceof File) {
      navigate(location.pathname, { replace: true, state: null });
      pickFile(state.file);
      return;
    }
    const doc = state?.document;
    if (!doc) return;
    navigate(location.pathname, { replace: true, state: null });
    (async () => {
      try {
        const url = await documentService.getFileUrl(user?.id ?? '', doc);
        const blob = await (await fetch(url)).blob();
        pickFile(new File([blob], doc.name, { type: doc.mimeType }));
      } catch (error) {
        toast({ title: 'Could not open the document', description: errorMessage(error), variant: 'destructive' });
      }
    })();
  }, [location.state, location.pathname, navigate, pickFile, toast, user?.id]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Quick summary: read the text in the browser, pick key sentences, reveal it progressively. */
  const runQuick = async (target: File, signal: AbortSignal) => {
    const text = await readDocumentText(target);
    const { markdown } = quickSummary(text, { length, focus, fileName: target.name });
    setStatus('streaming');
    const pieces = markdown.split(/(?<=\n)/);
    for (const piece of pieces) {
      if (signal.aborted) throw new DOMException('Stopped', 'AbortError');
      setOutput(prev => prev + piece);
      await new Promise(resolve => setTimeout(resolve, 35));
    }
    if (user) {
      try {
        await aiService.saveSummary(user.id, {
          fileName: target.name,
          mimeType: target.type || 'application/octet-stream',
          sizeBytes: target.size,
          length,
          focus,
          summary: markdown,
        });
      } catch {
        /* history table not set up — the summary is still shown */
      }
    }
  };

  const runAi = async (target: File, signal: AbortSignal) => {
    const source = await readDocument(target);
    setStatus('streaming');
    const result = await aiService.summarize(
      {
        fileName: target.name,
        mimeType: target.type || 'application/octet-stream',
        sizeBytes: target.size,
        source,
        options: { length, focus, language },
      },
      chunk => setOutput(prev => prev + chunk),
      signal,
    );
    if (result.truncated) {
      toast({ title: 'Summary cut short', description: 'The summary hit its length limit. Try “Standard” length or a smaller file.' });
    }
  };

  const run = async () => {
    if (!file || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setOutput('');
    setOutputTitle(file.name);
    setStatus('reading');
    outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      if (engine === 'ai' && !aiMissing) {
        try {
          await runAi(file, controller.signal);
        } catch (error) {
          // The AI server isn't deployed / configured yet: fall back to the quick summary.
          if ((error as Error).name === 'AbortError' || !(isSetupError(error) || /not configured/i.test(errorMessage(error)))) throw error;
          setAiMissing(true);
          setEngine('quick');
          setOutput('');
          toast({ title: 'AI summaries aren’t set up yet', description: 'Made a quick summary in your browser instead.' });
          await runQuick(file, controller.signal);
        }
      } else {
        await runQuick(file, controller.signal);
      }
      setStatus('done');
      void refresh();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setStatus('done');
        toast({ title: 'Stopped', description: 'The summary was stopped and not saved.' });
        return;
      }
      setStatus('error');
      toast({ title: 'Could not summarize', description: errorMessage(error), variant: 'destructive' });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([output], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${outputTitle.replace(/\.[^.]+$/, '') || 'document'}-summary.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const showSaved = (record: SummaryRecord) => {
    abortRef.current?.abort();
    setOutput(record.summary);
    setOutputTitle(record.fileName);
    setStatus('done');
    outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const record = pendingDelete;
    setPendingDelete(null);
    try {
      await remove.mutateAsync(record.id);
      toast({ title: 'Summary deleted' });
    } catch (error) {
      toast({ title: 'Delete failed', description: errorMessage(error), variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <header className="mb-8 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Summarizer
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Summarize any document</h1>
            <p className="text-muted-foreground mt-1">
              Papers, theses, slides, spreadsheets, notes or scanned pages — get a clear summary in seconds.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Input */}
            <Card className="lg:col-span-2 glass-card h-fit animate-fade-up [animation-delay:80ms]">
              <CardHeader>
                <CardTitle className="text-lg">1. Choose a document</CardTitle>
                <CardDescription>{SUPPORTED_LABEL} · up to 10 MB</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  className="hidden"
                  onChange={e => {
                    pickFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                {file ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3 animate-scale-in">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)} disabled={busy} aria-label="Remove file">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={e => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragging(false);
                      pickFile(e.dataTransfer.files?.[0]);
                    }}
                    className={cn(
                      'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                      dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40',
                    )}
                  >
                    <UploadCloud className={cn('h-10 w-10 text-muted-foreground transition-transform', dragging && 'scale-110 text-primary')} />
                    <span className="font-medium">Drop a file here or click to browse</span>
                    <span className="text-xs text-muted-foreground">Nothing is stored until you summarize</span>
                  </button>
                )}

                <div className="space-y-2">
                  <Label>2. Length</Label>
                  <ToggleGroup
                    type="single"
                    value={length}
                    onValueChange={v => v && setLength(v as SummaryLength)}
                    className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
                  >
                    {(['brief', 'standard', 'detailed'] as SummaryLength[]).map(l => (
                      <ToggleGroupItem
                        key={l}
                        value={l}
                        className="capitalize data-[state=on]:bg-background data-[state=on]:shadow-sm"
                      >
                        {l}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>3. Focus</Label>
                    <Select value={focus} onValueChange={v => setFocus(v as SummaryFocus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOCUS_OPTIONS.map(f => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language{engine === 'quick' && <span className="font-normal text-muted-foreground"> (AI only)</span>}</Label>
                    <Select value={language} onValueChange={setLanguage} disabled={engine === 'quick'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(l => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Summary type</Label>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Summary type">
                    {(
                      [
                        { value: 'ai', label: 'AI summary', hint: aiMissing ? 'Not set up yet' : 'Best quality · any file', icon: Sparkles },
                        { value: 'quick', label: 'Quick summary', hint: 'Free · in your browser', icon: Zap },
                      ] as const
                    ).map(option => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={engine === option.value}
                        disabled={busy || (option.value === 'ai' && aiMissing)}
                        onClick={() => setEngine(option.value)}
                        className={cn(
                          'flex flex-col items-start gap-0.5 rounded-lg border-2 p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                          engine === option.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <option.icon className="h-4 w-4 text-primary" /> {option.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{option.hint}</span>
                      </button>
                    ))}
                  </div>
                  {engine === 'quick' && (
                    <p className="text-xs text-muted-foreground">
                      Picks the most important sentences from the document. Works with PDF, Word, PowerPoint, Excel and text files (English works best).
                    </p>
                  )}
                </div>

                {busy ? (
                  <Button variant="outline" className="w-full" size="lg" onClick={() => abortRef.current?.abort()}>
                    <Square className="mr-2 h-4 w-4" /> Stop
                  </Button>
                ) : (
                  <Button
                    className="w-full shadow-lg shadow-primary/20"
                    size="lg"
                    onClick={run}
                    disabled={!file}
                  >
                    {engine === 'quick' ? <Zap className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />} Summarize
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Output */}
            <div ref={outputRef} className="lg:col-span-3 scroll-mt-24 animate-fade-up [animation-delay:160ms]">
              <Card className="glass-card min-h-[420px] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b">
                  <div className="min-w-0">
                    <CardTitle className="text-lg">Summary</CardTitle>
                    <CardDescription className="truncate">
                      {outputTitle || 'Your summary will appear here'}
                    </CardDescription>
                  </div>
                  {output && status !== 'streaming' && (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" onClick={copy} aria-label="Copy summary">
                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={download} aria-label="Download summary">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setOutput('');
                          setOutputTitle('');
                          setStatus('idle');
                        }}
                        aria-label="Clear"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 pt-6" aria-live="polite">
                  {status === 'reading' || (status === 'streaming' && !output) ? (
                    <div className="space-y-4">
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {status === 'reading' ? 'Reading your file…' : 'Reading the document and writing the summary…'}
                      </p>
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-11/12" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  ) : output ? (
                    <div className="text-sm">
                      <Markdown>{output}</Markdown>
                      {status === 'streaming' && (
                        <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-primary" aria-hidden />
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-float">
                        <Sparkles className="h-7 w-7" />
                      </div>
                      <p className="max-w-xs text-sm">
                        Choose a file and press <strong>Summarize</strong>. You'll see the summary appear as it's written.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* History */}
          {(
            <section className="mt-12">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-primary" /> Recent summaries
              </h2>
              {historyLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="h-36" />
                  ))}
                </div>
              ) : summaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Your summaries will be saved here.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {summaries.map((s, i) => (
                    <div
                      key={s.id}
                      className="group relative rounded-xl border bg-card p-4 hover-lift animate-fade-up"
                      style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                    >
                      <button type="button" onClick={() => showSaved(s)} className="block w-full text-left space-y-2">
                        <p className="font-medium truncate pr-8">{s.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.createdAt).toLocaleString()} · <span className="capitalize">{s.length}</span> ·{' '}
                          {FOCUS_LABEL[s.focus] ?? s.focus}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {s.summary.replace(/[#*_`>-]/g, '').replace(/\s+/g, ' ').slice(0, 220)}
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 opacity-60 hover:opacity-100 hover:text-destructive"
                        onClick={() => setPendingDelete(s)}
                        aria-label={`Delete summary of ${s.fileName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={open => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this summary?</AlertDialogTitle>
            <AlertDialogDescription>The summary of “{pendingDelete?.fileName}” will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default Summarize;
