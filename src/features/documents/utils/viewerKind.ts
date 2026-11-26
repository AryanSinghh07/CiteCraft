/** How the in-app viewer shows a file, decided from its name and type. */
export type ViewerKind =
  | 'pdf'
  | 'image'
  | 'video'
  | 'audio'
  | 'markdown'
  | 'table'
  | 'html'
  | 'notebook'
  | 'text'
  | 'word'
  | 'slides'
  | 'sheet'
  | 'unsupported';

const IMAGES = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'];
const VIDEOS = ['mp4', 'webm', 'ogv', 'mov', 'm4v'];
const AUDIO = ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus'];
const TEXT = [
  'txt', 'log', 'json', 'xml', 'yaml', 'yml', 'tex', 'bib', 'rtf', 'srt', 'vtt', 'ini', 'cfg', 'toml', 'env',
  'py', 'js', 'ts', 'tsx', 'jsx', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'r', 'm',
  'sql', 'sh', 'bat', 'ps1', 'css', 'scss', 'kt', 'swift', 'dart', 'lua', 'pl', 'scala',
];

export const extensionOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');

export function viewerKind(name: string, mimeType = ''): ViewerKind {
  const ext = extensionOf(name);
  const type = mimeType.toLowerCase();
  if (ext === 'pdf' || type === 'application/pdf') return 'pdf';
  if (IMAGES.includes(ext) || type.startsWith('image/')) return 'image';
  if (VIDEOS.includes(ext) || type.startsWith('video/')) return 'video';
  if (AUDIO.includes(ext) || type.startsWith('audio/')) return 'audio';
  if (ext === 'md' || ext === 'markdown' || type === 'text/markdown') return 'markdown';
  if (ext === 'csv' || ext === 'tsv' || type === 'text/csv') return 'table';
  if (ext === 'html' || ext === 'htm' || type === 'text/html') return 'html';
  if (ext === 'ipynb') return 'notebook';
  if (ext === 'docx' || ext === 'odt') return 'word';
  if (ext === 'pptx' || ext === 'odp') return 'slides';
  if (ext === 'xlsx' || ext === 'ods') return 'sheet';
  if (TEXT.includes(ext) || type.startsWith('text/') || type === 'application/json') return 'text';
  return 'unsupported';
}

export const KIND_LABEL: Record<ViewerKind, string> = {
  pdf: 'PDF',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  markdown: 'Markdown',
  table: 'Table',
  html: 'Web page',
  notebook: 'Notebook',
  text: 'Text',
  word: 'Document',
  slides: 'Slides',
  sheet: 'Spreadsheet',
  unsupported: 'File',
};

/** Minimal CSV / TSV parser that handles quoted fields with commas and line breaks. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

/** Splits extracted Office text on its "--- Slide 1 ---" / "--- Sheet 1 ---" markers. */
export function splitSections(text: string): { title: string; body: string }[] {
  const parts = text.split(/^--- (.+?) ---$/m);
  const sections: { title: string; body: string }[] = [];
  if (parts[0].trim()) sections.push({ title: '', body: parts[0].trim() });
  for (let i = 1; i < parts.length; i += 2) sections.push({ title: parts[i], body: (parts[i + 1] ?? '').trim() });
  return sections;
}
