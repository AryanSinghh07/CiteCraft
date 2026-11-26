import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
import { FileUp, Loader2, FileText, Download, Trash2, ExternalLink, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { env } from '@/config/env';
import { MAX_DOCUMENT_BYTES } from '@/services';
import type { DocumentRecord } from '@/types';
import { useDocuments } from '../hooks/useDocuments';

const ACCEPT = '.txt,.pdf,.docx,.pptx';

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

export const DocumentUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DocumentRecord | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { documents, isLoading, upload, remove, open } = useDocuments();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > MAX_DOCUMENT_BYTES) {
      toast({ title: 'File too large', description: 'Files must be 10 MB or smaller.', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setFile(selected);
    setSummary(null);
  };

  const resetSelection = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!file) return;
    try {
      await upload.mutateAsync({ file });
      toast({ title: 'Document saved', description: `${file.name} was added to your library.` });
      resetSelection();
    } catch (error) {
      toast({ title: 'Upload failed', description: errorMessage(error), variant: 'destructive' });
    }
  };

  // Optional: send the file to the summarization service configured in VITE_SUMMARY_API_URL.
  const handleSummarize = async () => {
    if (!file || !env.summaryApiUrl) return;
    setIsSummarizing(true);
    const formData = new FormData();
    formData.append('document', file);
    try {
      const response = await fetch(`${env.summaryApiUrl.replace(/\/$/, '')}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('The summary service could not process this document.');
      const data = await response.json();
      setSummary(data.summary);
      toast({ title: 'Summary ready', description: 'Your document summary has been generated.' });
    } catch (error) {
      toast({ title: 'Summarization failed', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDownloadSummary = () => {
    if (!summary) return;
    const url = URL.createObjectURL(new Blob([summary], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace(/\.[^.]+$/, '') ?? 'document'}-summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpen = async (doc: DocumentRecord) => {
    try {
      await open(doc);
    } catch (error) {
      toast({ title: 'Could not open file', description: errorMessage(error), variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const doc = pendingDelete;
    setPendingDelete(null);
    try {
      await remove.mutateAsync(doc);
      toast({ title: 'Document deleted', description: doc.name });
    } catch (error) {
      toast({ title: 'Delete failed', description: errorMessage(error), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="w-full shadow-lg border-primary/10 hover:border-primary/30 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Upload a Document
          </CardTitle>
          <CardDescription>Store papers, preprints and slides securely alongside your publications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <label htmlFor="document" className="text-sm font-medium">
              Choose file
            </label>
            <Input
              ref={inputRef}
              id="document"
              type="file"
              accept={ACCEPT}
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">TXT, PDF, DOCX or PPTX · up to 10 MB</p>
          </div>

          {file && (
            <div className="bg-muted/30 p-3 rounded-md animate-fade-in">
              <p className="text-sm font-medium">Selected file:</p>
              <p className="text-sm">
                {file.name} ({formatSize(file.size)})
              </p>
            </div>
          )}

          {summary && (
            <div className="mt-4 animate-fade-in">
              <h3 className="text-lg font-medium mb-2">Document Summary</h3>
              <Textarea value={summary} readOnly className="h-[200px] overflow-auto" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleSave} disabled={!file || upload.isPending} className="w-full sm:flex-1">
            {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            {upload.isPending ? 'Saving…' : 'Save to library'}
          </Button>
          {env.summaryApiUrl && (
            <Button
              onClick={handleSummarize}
              variant="secondary"
              disabled={!file || isSummarizing}
              className="w-full sm:flex-1"
            >
              {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isSummarizing ? 'Summarizing…' : 'Generate summary'}
            </Button>
          )}
          {summary && (
            <Button onClick={handleDownloadSummary} variant="outline" className="w-full sm:flex-1">
              <Download className="mr-2 h-4 w-4" />
              Download summary
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your documents</CardTitle>
          <CardDescription>
            {documents.length} {documents.length === 1 ? 'file' : 'files'} stored
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No documents yet. Upload one above.</p>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map(doc => (
                <li key={doc.id} className="flex items-center gap-3 py-3 animate-fade-in">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleOpen(doc)} aria-label={`Open ${doc.name}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete(doc)}
                    aria-label={`Delete ${doc.name}`}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={isOpen => !isOpen && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentUpload;
