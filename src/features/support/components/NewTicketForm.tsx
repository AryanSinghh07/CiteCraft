import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TicketCategory, TicketInput, TicketPriority } from '@/types';
import { Loader2, Send } from 'lucide-react';
import AttachmentPicker from './AttachmentPicker';
import { CATEGORIES, CATEGORY_LABELS, PRIORITIES, PRIORITY_META } from '../utils/ticketMeta';

interface NewTicketFormProps {
  onSubmit: (input: TicketInput, files: File[]) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const NewTicketForm = ({ onSubmit, onCancel, isSubmitting }: NewTicketFormProps) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('bug');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit({ subject, description, category, priority }, files);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Short summary of your query"
          minLength={3}
          maxLength={200}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={v => setCategory(v as TicketCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={v => setPriority(v as TicketPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(p => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_META[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={6}
          maxLength={5000}
          placeholder="What happened? What did you expect? Steps to reproduce help us fix things faster."
          required
        />
        <p className="text-xs text-muted-foreground text-right">{description.length}/5000</p>
      </div>

      <AttachmentPicker files={files} onChange={setFiles} disabled={isSubmitting} />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit ticket
        </Button>
      </div>
    </form>
  );
};

export default NewTicketForm;
