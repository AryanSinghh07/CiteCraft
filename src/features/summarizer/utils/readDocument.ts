import type { SummarySource } from '@/types';

/**
 * Turns an uploaded file into what the summarizer accepts:
 *  - PDFs and images are sent as-is (base64) — the model reads them directly,
 *    including scanned pages and figures.
 *  - Office / OpenDocument files are unzipped in the browser and their text extracted.
 *  - Anything text-based (txt, md, csv, html, json, tex, bib, code…) is read as text.
 */

export const MAX_SUMMARY_FILE_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

const ZIP_FORMATS = ['docx', 'pptx', 'xlsx', 'odt', 'odp', 'ods'] as const;
type ZipFormat = (typeof ZIP_FORMATS)[number];

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'xml', 'html', 'htm', 'rtf', 'tex', 'bib', 'log', 'yaml', 'yml',
  'py', 'js', 'ts', 'tsx', 'jsx', 'java', 'c', 'cpp', 'h', 'r', 'm', 'sql', 'ipynb', 'srt', 'vtt',
]);

export const ACCEPTED_EXTENSIONS = [
  'pdf', ...Object.keys(IMAGE_TYPES), ...ZIP_FORMATS, ...TEXT_EXTENSIONS,
].map(ext => `.${ext}`).join(',');

export const SUPPORTED_LABEL = 'PDF, Word, PowerPoint, Excel, OpenDocument, images, text, Markdown, CSV, HTML, LaTeX and more';

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

async function toBase64(file: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

const decodeEntities = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');

/** Text from WordprocessingML / DrawingML / OpenDocument XML, keeping paragraph breaks. */
function xmlToText(xml: string): string {
  return decodeEntities(
    xml
      .replace(/<w:tab\/>|<text:tab\/>/g, '\t')
      .replace(/<w:br[^>]*\/>|<a:br[^>]*\/>|<text:line-break\/>/g, '\n')
      .replace(/<\/(w:p|a:p|text:p|text:h)>/g, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const numericSuffix = (path: string) => Number(/(\d+)\.xml$/.exec(path)?.[1] ?? 0);

async function readZipText(file: File, format: ZipFormat): Promise<string> {
  const { default: JSZip } = await import('jszip');
  let zip: Awaited<ReturnType<typeof JSZip.loadAsync>>;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error('This file could not be opened. It may be corrupted or password-protected.');
  }
  const read = (path: string) => zip.file(path)?.async('string') ?? Promise.resolve('');
  const files = (pattern: RegExp) => Object.keys(zip.files).filter(p => pattern.test(p)).sort((a, b) => numericSuffix(a) - numericSuffix(b));

  switch (format) {
    case 'docx': {
      const parts = ['word/document.xml', ...files(/^word\/(footnotes|endnotes)\.xml$/)];
      return (await Promise.all(parts.map(read))).map(xmlToText).filter(Boolean).join('\n\n');
    }
    case 'pptx': {
      const slides = files(/^ppt\/slides\/slide\d+\.xml$/);
      const notes = files(/^ppt\/notesSlides\/notesSlide\d+\.xml$/);
      const slideText = await Promise.all(slides.map(async (path, i) => `--- Slide ${i + 1} ---\n${xmlToText(await read(path))}`));
      const noteText = (await Promise.all(notes.map(read))).map(xmlToText).filter(Boolean);
      return [...slideText, ...(noteText.length ? ['--- Speaker notes ---', ...noteText] : [])].join('\n\n');
    }
    case 'xlsx': {
      const shared = [...(await read('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => xmlToText(m[1]));
      const sheets = files(/^xl\/worksheets\/sheet\d+\.xml$/);
      const out: string[] = [];
      for (const [i, path] of sheets.entries()) {
        const xml = await read(path);
        const rows = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map(row =>
          [...row[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)]
            .map(([, attrs, inner]) => {
              const value = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? xmlToText(inner);
              return /t="s"/.test(attrs) ? shared[Number(value)] ?? '' : decodeEntities(value);
            })
            .join('\t'),
        );
        out.push(`--- Sheet ${i + 1} ---\n${rows.join('\n')}`);
      }
      return out.join('\n\n');
    }
    default:
      // OpenDocument text / presentation / spreadsheet
      return xmlToText(await read('content.xml'));
  }
}

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
  return (doc.body?.innerText || doc.body?.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

const rtfToText = (rtf: string) =>
  rtf
    .replace(/\\par[d]?/g, '\n')
    .replace(/\{\\\*[^{}]*\}/g, '')
    .replace(/\\'[0-9a-f]{2}/gi, '')
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .trim();

function notebookToText(json: string): string {
  try {
    const nb = JSON.parse(json) as { cells?: { cell_type: string; source: string | string[] }[] };
    return (nb.cells ?? [])
      .map(c => `[${c.cell_type}]\n${Array.isArray(c.source) ? c.source.join('') : c.source}`)
      .join('\n\n');
  } catch {
    return json;
  }
}

export async function readDocument(file: File): Promise<SummarySource> {
  if (file.size === 0) throw new Error('This file is empty.');
  if (file.size > MAX_SUMMARY_FILE_BYTES) throw new Error('Files must be 10 MB or smaller.');

  const ext = extensionOf(file.name);
  const type = file.type;

  if (ext === 'pdf' || type === 'application/pdf') {
    return { kind: 'pdf', data: await toBase64(file), mediaType: 'application/pdf' };
  }
  const imageType = IMAGE_TYPES[ext] ?? (Object.values(IMAGE_TYPES).includes(type) ? type : undefined);
  if (imageType) {
    return { kind: 'image', data: await toBase64(file), mediaType: imageType };
  }
  if ((ZIP_FORMATS as readonly string[]).includes(ext)) {
    const text = await readZipText(file, ext as ZipFormat);
    if (!text.trim()) throw new Error('No text was found in this file. If it only contains images, export it as PDF first.');
    return { kind: 'text', text };
  }
  if (ext === 'doc' || ext === 'ppt' || ext === 'xls') {
    throw new Error(`Old .${ext} files aren't supported. Save it as .${ext}x or PDF and try again.`);
  }

  // Treat anything else as text, but refuse binary files.
  const raw = await file.text();
  const replacementChars = (raw.slice(0, 5000).match(/�/g) ?? []).length;
  if (replacementChars > 20 || raw.slice(0, 5000).includes('\u0000')) {
    throw new Error(`This file type isn't supported. Try ${SUPPORTED_LABEL}.`);
  }
  let text = raw;
  if (ext === 'html' || ext === 'htm' || type === 'text/html') text = htmlToText(raw);
  else if (ext === 'rtf') text = rtfToText(raw);
  else if (ext === 'ipynb') text = notebookToText(raw);
  if (!text.trim()) throw new Error('No text was found in this file.');
  return { kind: 'text', text };
}

/** Text from a PDF, read in the browser with PDF.js (loaded only when needed). */
async function pdfText(file: File): Promise<string> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pages: string[] = [];
  try {
    let doc: Awaited<typeof task.promise>;
    try {
      doc = await task.promise;
    } catch {
      throw new Error('This PDF could not be opened. It may be corrupted or password-protected.');
    }
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      let page = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        page += item.str + (item.hasEOL ? '\n' : ' ');
      }
      pages.push(page);
    }
  } finally {
    // In PDF.js 6 the loading task (not the document) frees the worker and memory.
    await task.destroy().catch(() => undefined);
  }
  const text = pages.join('\n\n').replace(/[ \t]+/g, ' ').trim();
  if (text.replace(/\s/g, '').length < 50) {
    throw new Error('This PDF has no selectable text (it may be a scan). The AI summarizer can read scanned pages once it is set up.');
  }
  return text;
}

/** Plain text of any supported document, for the in-browser quick summary. Images aren't supported. */
export async function readDocumentText(file: File): Promise<string> {
  const ext = extensionOf(file.name);
  if (ext === 'pdf' || file.type === 'application/pdf') {
    if (file.size > MAX_SUMMARY_FILE_BYTES) throw new Error('Files must be 10 MB or smaller.');
    return pdfText(file);
  }
  const source = await readDocument(file);
  if (source.kind === 'image') {
    throw new Error('Images need the AI summarizer, which isn’t set up yet. Try a PDF, Word, PowerPoint or text file.');
  }
  if (source.kind !== 'text') throw new Error('Unsupported file.');
  return source.text;
}
