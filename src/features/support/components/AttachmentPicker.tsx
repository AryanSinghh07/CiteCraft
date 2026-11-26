import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MAX_TICKET_FILES, MAX_TICKET_FILE_BYTES, TICKET_FILE_TYPES } from '@/services';
import { Paperclip, X } from 'lucide-react';

interface AttachmentPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

/** Lets users attach up to 3 screenshots / PDFs / text files (5 MB each). */
const AttachmentPicker = ({ files, onChange, disabled }: AttachmentPickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    const accepted: File[] = [];
    for (const file of selected) {
      if (!TICKET_FILE_TYPES.includes(file.type)) {
        toast({ title: 'File type not allowed', description: `${file.name}: use an image, PDF or text file.`, variant: 'destructive' });
      } else if (file.size > MAX_TICKET_FILE_BYTES) {
        toast({ title: 'File too large', description: `${file.name} is larger than 5 MB.`, variant: 'destructive' });
      } else {
        accepted.push(file);
      }
    }
    const next = [...files, ...accepted];
    if (next.length > MAX_TICKET_FILES) {
      toast({ title: 'Too many files', description: `You can attach up to ${MAX_TICKET_FILES} files.`, variant: 'destructive' });
    }
    onChange(next.slice(0, MAX_TICKET_FILES));
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={TICKET_FILE_TYPES.join(',')}
        onChange={handleSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || files.length >= MAX_TICKET_FILES}
        className="text-muted-foreground"
      >
        <Paperclip className="mr-1.5 h-4 w-4" />
        Attach files
      </Button>
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs animate-fade-in"
            >
              <span className="max-w-[160px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                aria-label={`Remove ${file.name}`}
                className="opacity-60 hover:opacity-100"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AttachmentPicker;
