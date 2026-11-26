import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Markdown from '@/components/common/Markdown';
import { Download, ExternalLink, FileQuestion, Loader2, Minus, Plus, Sparkles } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { readDocument } from '@/features/summarizer/utils/readDocument';
import { KIND_LABEL, parseDelimited, splitSections, viewerKind, extensionOf, type ViewerKind } from '../utils/viewerKind';

/** A file to show in the viewer. `load` fetches it only when the viewer opens. */
export interface ViewerSource {
  name: string;
  mimeType?: string;
  size?: number;
  load: () => Promise<Blob>;
}

interface Props {
  source: ViewerSource | null;
  onClose: () => void;
  /** Shows a "Summarize" button that hands the file to the summarizer. */
  onSummarize?: (file: File) => void;
}

const MAX_TEXT = 300_000; // characters shown for text files
const MAX_ROWS = 1_000; // rows shown for tables
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

type Loaded =
  | { kind: 'pdf' | 'image' | 'video' | 'audio' | 'unsupported' }
  | { kind: 'text' | 'markdown' | 'html'; text: string; cut: boolean }
  | { kind: 'table'; rows: string[][]; total: number }
  | { kind: 'notebook'; cells: { type: string; source: string }[] }
  | { kind: 'word'; text: string }
  | { kind: 'slides'; sections: { title: string; body: string }[] }
  | { kind: 'sheet'; sheets: { title: string; rows: string[][] }[] };

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

async function prepare(kind: ViewerKind, blob: Blob, name: string): Promise<Loaded> {
  switch (kind) {
    case 'text':
    case 'markdown': {
      const text = await blob.text();
      return { kind, text: text.slice(0, MAX_TEXT), cut: text.length > MAX_TEXT };
    }
    case 'html': {
      // Shown as a reading view (text only) — the page's own scripts and styles never run.
      const doc = new DOMParser().parseFromString(await blob.text(), 'text/html');
      doc.querySelectorAll('script, style, noscript, template').forEach(el => el.remove());
      const text = (doc.body?.textContent ?? '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      return { kind, text: text.slice(0, MAX_TEXT), cut: text.length > MAX_TEXT };
    }
    case 'table': {
      const rows = parseDelimited(await blob.text(), extensionOf(name) === 'tsv' ? '\t' : ',');
      return { kind, rows: rows.slice(0, MAX_ROWS + 1), total: rows.length };
    }
    case 'notebook': {
      try {
        const nb = JSON.parse(await blob.text()) as { cells?: { cell_type: string; source: string | string[] }[] };
        return {
          kind,
          cells: (nb.cells ?? []).map(c => ({ type: c.cell_type, source: Array.isArray(c.source) ? c.source.join('') : c.source })),
        };
      } catch {
        return { kind: 'text', text: (await blob.text()).slice(0, MAX_TEXT), cut: false };
      }
    }
    case 'word':
    case 'slides':
    case 'sheet': {
      const source = await readDocument(new File([blob], name, { type: blob.type }));
      const text = source.kind === 'text' ? source.text : '';
      if (kind === 'word') return { kind, text };
      const sections = splitSections(text).filter(s => !/^Speaker notes$/i.test(s.title) || s.body);
      if (kind === 'slides') return { kind, sections };
      return {
        kind,
        sheets: sections.map(s => ({ title: s.title, rows: s.body.split('\n').map(r => r.split('\t')).slice(0, MAX_ROWS) })),
      };
    }
    default:
      return { kind };
  }
}

/** One PDF page, drawn when it scrolls into view. */
function PdfPage({ doc, number, zoom }: { doc: PdfDoc; number: number; zoom: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(number <= 2);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = holderRef.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === 'undefined') return setVisible(true);
    const io = new IntersectionObserver(entries => entries.some(e => e.isIntersecting) && setVisible(true), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<unknown> } | undefined;
    (async () => {
      const page = await doc.getPage(number);
      const viewport = page.getViewport({ scale: zoom * 1.25 });
      const ratio = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      setSize({ w: viewport.width, h: viewport.height });
      task = page.render({
        canvas,
        viewport,
        transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
      });
      await task.promise.catch(() => undefined);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, number, zoom, visible]);

  return (
    <div ref={holderRef} className="mx-auto w-fit">
      <canvas
        ref={canvasRef}
        className="block bg-white shadow-md ring-1 ring-border"
        style={size ? { width: size.w, height: size.h } : { width: 612 * zoom * 1.25, height: 792 * zoom * 1.25 }}
        aria-label={`Page ${number}`}
      />
      <p className="mt-1 text-center text-xs text-muted-foreground">Page {number}</p>
    </div>
  );
}

type PdfDoc = PDFDocumentProxy;

function PdfView({ blob, zoom }: { blob: Blob; zoom: number }) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let destroy: (() => Promise<void>) | undefined;
    let cancelled = false;
    (async () => {
      const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
      destroy = () => task.destroy();
      const loaded = await task.promise;
      if (!cancelled) setDoc(loaded);
    })().catch(() => !cancelled && setError('This PDF could not be opened. It may be corrupted or password-protected.'));
    return () => {
      cancelled = true;
      void destroy?.().catch(() => undefined);
    };
  }, [blob]);

  if (error) return <ViewerMessage title="Can't show this PDF" text={error} />;
  if (!doc) return <LoadingPages />;
  return (
    <div className="space-y-6">
      <p className="text-center text-xs text-muted-foreground">{doc.numPages} {doc.numPages === 1 ? 'page' : 'pages'}</p>
      {Array.from({ length: doc.numPages }, (_, i) => (
        <PdfPage key={i} doc={doc} number={i + 1} zoom={zoom} />
      ))}
    </div>
  );
}

const LoadingPages = () => (
  <div className="mx-auto max-w-2xl space-y-3 p-6" aria-label="Loading">
    <Skeleton className="h-6 w-1/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-11/12" />
    <Skeleton className="h-4 w-4/5" />
    <Skeleton className="h-64 w-full" />
  </div>
);

function ViewerMessage({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <FileQuestion className="h-7 w-7" />
      </div>
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

function DataTable({ rows, note }: { rows: string[][]; note?: string }) {
  if (rows.length === 0) return <p className="p-6 text-center text-sm text-muted-foreground">This sheet is empty.</p>;
  const [head, ...body] = rows;
  return (
    <div className="space-y-2">
      <div className="overflow-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th className="w-10 border-b px-2 py-1.5 text-right text-xs font-normal text-muted-foreground">#</th>
              {head.map((cell, i) => (
                <th key={i} className="whitespace-nowrap border-b px-3 py-1.5 text-left font-semibold">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className="odd:bg-muted/30">
                <td className="px-2 py-1 text-right text-xs text-muted-foreground">{r + 1}</td>
                {head.map((_, c) => (
                  <td key={c} className="max-w-xs truncate px-3 py-1" title={row[c]}>
                    {row[c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

const CutNote = () => (
  <p className="mt-4 text-xs text-muted-foreground">The file is long — only the beginning is shown. Download it to see everything.</p>
);

export function DocumentViewer({ source, onClose, onSummarize }: Props) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);

  const kind = useMemo(() => (source ? viewerKind(source.name, source.mimeType) : 'unsupported'), [source]);
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : ''), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  useEffect(() => {
    setBlob(null);
    setLoaded(null);
    setError('');
    setZoom(1);
    if (!source) return;
    let cancelled = false;
    (async () => {
      const data = await source.load();
      if (cancelled) return;
      // Give the blob the right type so images, audio and video play.
      const typed = data.type || !source.mimeType ? data : new Blob([data], { type: source.mimeType });
      setBlob(typed);
      const prepared = await prepare(kind, typed, source.name);
      if (!cancelled) setLoaded(prepared);
    })().catch(err => !cancelled && setError(err instanceof Error ? err.message : 'This file could not be opened.'));
    return () => {
      cancelled = true;
    };
  }, [source, kind]);

  const zoomable = kind === 'pdf' || kind === 'image';
  const zoomIndex = ZOOMS.indexOf(zoom);

  const download = () => {
    if (!url || !source) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = source.name;
    a.click();
  };
  const openTab = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const body = () => {
    if (error) {
      return <ViewerMessage title="Couldn't open this file" text={error} />;
    }
    if (!blob || !loaded) return <LoadingPages />;
    switch (loaded.kind) {
      case 'pdf':
        return <PdfView blob={blob} zoom={zoom} />;
      case 'image':
        return (
          <div className="flex min-h-full items-center justify-center">
            <img
              src={url}
              alt={source?.name}
              className="max-w-none rounded-md shadow-md"
              style={{ width: zoom === 1 ? undefined : `${zoom * 100}%`, maxWidth: zoom === 1 ? '100%' : undefined }}
            />
          </div>
        );
      case 'video':
        return (
          <video src={url} controls className="mx-auto max-h-full w-full rounded-md bg-black">
            Your browser can't play this video.
          </video>
        );
      case 'audio':
        return (
          <div className="flex min-h-[200px] items-center justify-center">
            <audio src={url} controls className="w-full max-w-lg" />
          </div>
        );
      case 'markdown':
        return (
          <article className="mx-auto max-w-3xl text-sm">
            <Markdown>{loaded.text}</Markdown>
            {loaded.cut && <CutNote />}
          </article>
        );
      case 'html':
      case 'word':
        return (
          <article className="mx-auto max-w-3xl rounded-md bg-card p-6 text-sm leading-relaxed shadow-sm ring-1 ring-border sm:p-10">
            {loaded.text ? (
              loaded.text.split(/\n{2,}|\n/).map((p, i) => (p.trim() ? <p key={i} className="mb-3">{p}</p> : null))
            ) : (
              <p className="text-muted-foreground">No text was found in this document.</p>
            )}
            {'cut' in loaded && loaded.cut && <CutNote />}
          </article>
        );
      case 'text':
        return (
          <div>
            <pre className="overflow-auto rounded-md bg-muted/50 p-4 font-mono text-xs leading-relaxed ring-1 ring-border">
              {loaded.text.split('\n').map((line, i) => (
                <div key={i} className="flex">
                  <span className="mr-4 inline-block w-10 shrink-0 select-none text-right text-muted-foreground/60">{i + 1}</span>
                  <span className="whitespace-pre-wrap break-words">{line || ' '}</span>
                </div>
              ))}
            </pre>
            {loaded.cut && <CutNote />}
          </div>
        );
      case 'table':
        return (
          <DataTable
            rows={loaded.rows}
            note={loaded.total > MAX_ROWS + 1 ? `Showing the first ${MAX_ROWS.toLocaleString()} of ${(loaded.total - 1).toLocaleString()} rows.` : undefined}
          />
        );
      case 'notebook':
        return (
          <div className="mx-auto max-w-3xl space-y-3">
            {loaded.cells.map((cell, i) =>
              cell.type === 'markdown' ? (
                <div key={i} className="text-sm">
                  <Markdown>{cell.source}</Markdown>
                </div>
              ) : (
                <pre key={i} className="overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs ring-1 ring-border">
                  <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">{cell.type}</span>
                  {cell.source}
                </pre>
              ),
            )}
          </div>
        );
      case 'slides':
        return (
          <div className="mx-auto grid max-w-3xl gap-4">
            {loaded.sections.length === 0 && <p className="text-center text-sm text-muted-foreground">No text was found in these slides.</p>}
            {loaded.sections.map((s, i) => (
              <section key={i} className="aspect-video overflow-auto rounded-lg bg-card p-6 shadow-sm ring-1 ring-border">
                {s.title && <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">{s.title}</p>}
                {s.body.split('\n').filter(Boolean).map((line, j) => (
                  <p key={j} className={j === 0 ? 'mb-2 text-lg font-semibold' : 'mb-1 text-sm'}>
                    {line}
                  </p>
                ))}
              </section>
            ))}
          </div>
        );
      case 'sheet':
        return (
          <div className="space-y-6">
            {loaded.sheets.map((s, i) => (
              <section key={i} className="space-y-2">
                {s.title && <p className="text-sm font-semibold">{s.title}</p>}
                <DataTable rows={s.rows} />
              </section>
            ))}
          </div>
        );
      default:
        return (
          <ViewerMessage
            title="No preview for this file type"
            text="CiteCraft can't show this kind of file in the browser yet. Download it to open it on your device."
          >
            <Button onClick={download} disabled={!url}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </ViewerMessage>
        );
    }
  };

  return (
    <Dialog open={Boolean(source)} onOpenChange={open => !open && onClose()}>
      <DialogContent data-document-viewer="" className="flex h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 pr-12">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base">{source?.name}</DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {KIND_LABEL[kind]}
              </Badge>
              {source?.size ? formatSize(source.size) : null}
              {(kind === 'html' || kind === 'word' || kind === 'slides' || kind === 'sheet') && <span>· text preview</span>}
            </DialogDescription>
          </div>
          {zoomable && (
            <div className="flex items-center gap-1" role="group" aria-label="Zoom">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={zoomIndex <= 0} onClick={() => setZoom(ZOOMS[zoomIndex - 1])} aria-label="Zoom out">
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={zoomIndex >= ZOOMS.length - 1} onClick={() => setZoom(ZOOMS[zoomIndex + 1])} aria-label="Zoom in">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
          {onSummarize && kind !== 'video' && kind !== 'audio' && kind !== 'unsupported' && (
            <Button
              size="sm"
              variant="secondary"
              disabled={!blob}
              onClick={() => blob && source && onSummarize(new File([blob], source.name, { type: blob.type }))}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Summarize
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={openTab} disabled={!url} aria-label="Open in a new tab" title="Open in a new tab">
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={download} disabled={!url} aria-label="Download" title="Download">
            {url ? <Download className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
          </Button>
        </div>
        <div className="flex-1 overflow-auto bg-muted/30 p-4 sm:p-6">{body()}</div>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentViewer;
