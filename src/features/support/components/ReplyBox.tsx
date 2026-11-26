import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2, Lock, Send } from 'lucide-react';
import AttachmentPicker from './AttachmentPicker';

interface ReplyBoxProps {
  onSend: (message: { body: string; isInternal: boolean; files: File[] }) => Promise<void>;
  isSending: boolean;
  /** staff can post internal notes */
  allowInternal?: boolean;
}

const ReplyBox = ({ onSend, isSending, allowInternal = false }: ReplyBoxProps) => {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isInternal, setIsInternal] = useState(false);

  const submit = async () => {
    if (!body.trim() || isSending) return;
    try {
      await onSend({ body, isInternal, files });
      setBody('');
      setFiles([]);
      setIsInternal(false);
    } catch {
      // the caller shows the error; keep the draft
    }
  };

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        void submit();
      }}
      className={cn(
        'rounded-lg border bg-card p-3 space-y-3 transition-colors',
        isInternal && 'border-dashed border-amber-500/50 bg-amber-500/5',
      )}
    >
      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={isInternal ? 'Write an internal note (only staff can see this)…' : 'Write a reply…'}
        rows={3}
        maxLength={5000}
        className="resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
        aria-label="Reply"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <AttachmentPicker files={files} onChange={setFiles} disabled={isSending} />
          {allowInternal && (
            <div className="flex items-center gap-2">
              <Switch id="internal-note" checked={isInternal} onCheckedChange={setIsInternal} />
              <Label htmlFor="internal-note" className="flex items-center gap-1 text-xs font-normal cursor-pointer">
                <Lock className="h-3 w-3" /> Internal note
              </Label>
            </div>
          )}
        </div>
        <Button type="submit" size="sm" disabled={!body.trim() || isSending} className="self-end sm:self-auto">
          {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          {isInternal ? 'Add note' : 'Send'}
        </Button>
      </div>
    </form>
  );
};

export default ReplyBox;
