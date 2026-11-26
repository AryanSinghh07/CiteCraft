
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Publication, PublicationType } from '@/types';
import { XIcon, PlusIcon, Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { lookupDoi } from '../utils/doi';
import { GENERIC_VENUE_TYPES, PUBLICATION_TYPES, typeOptions } from '../utils/publicationTypes';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface PublicationFormProps {
  initialData?: Publication;
  /** For new publications `id` is an empty string; the data layer assigns the real id. */
  onSubmit: (publication: Publication) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const PublicationForm = ({ initialData, onSubmit, onCancel, isSubmitting = false }: PublicationFormProps) => {
  const { profile: currentProfile } = useAuth();
  const defaultType: PublicationType = currentProfile?.accountType === 'student' ? 'project' : 'journal';
  const [publication, setPublication] = useState<Publication>(
    initialData || {
      id: '',
      title: '',
      authors: [''],
      year: new Date().getFullYear(),
      type: defaultType,
      tags: [],
    }
  );
  const [tag, setTag] = useState('');
  const [doiQuery, setDoiQuery] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const { toast } = useToast();
  const isStudent = currentProfile?.accountType === 'student';

  // Fill the form from Crossref (new publications only).
  const handleDoiFill = async () => {
    if (!doiQuery.trim()) return;
    setIsLookingUp(true);
    try {
      const found = await lookupDoi(doiQuery);
      setPublication(prev => ({
        ...prev,
        ...found,
        authors: found.authors.length ? found.authors : prev.authors,
        tags: found.tags?.length ? found.tags : prev.tags,
      }));
      toast({ title: 'Details filled in', description: 'Check the fields below, then save.' });
    } catch (error) {
      toast({
        title: 'DOI lookup failed',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPublication(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTypeChange = (value: string) => {
    setPublication(prev => ({
      ...prev,
      type: value as PublicationType
    }));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setPublication(prev => ({
        ...prev,
        year: value
      }));
    }
  };

  const handleCitationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setPublication(prev => ({
      ...prev,
      citations: isNaN(value) ? 0 : Math.max(0, value)
    }));
  };

  const handleAuthorChange = (index: number, value: string) => {
    const newAuthors = [...publication.authors];
    newAuthors[index] = value;
    setPublication(prev => ({
      ...prev,
      authors: newAuthors
    }));
  };

  const addAuthor = () => {
    setPublication(prev => ({
      ...prev,
      authors: [...prev.authors, '']
    }));
  };

  const removeAuthor = (index: number) => {
    if (publication.authors.length > 1) {
      setPublication(prev => ({
        ...prev,
        authors: prev.authors.filter((_, i) => i !== index)
      }));
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    if (tag.trim() && !publication.tags?.includes(tag.trim())) {
      setPublication(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag.trim()]
      }));
      setTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setPublication(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tagToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit({
      ...publication,
      title: publication.title.trim(),
      authors: publication.authors.map(a => a.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!initialData && (
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 space-y-2">
          <Label htmlFor="doi-lookup" className="flex items-center gap-1.5">
            <Wand2 className="h-4 w-4 text-primary" /> Fill in from a DOI
          </Label>
          <div className="flex gap-2">
            <Input
              id="doi-lookup"
              value={doiQuery}
              onChange={e => setDoiQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleDoiFill();
                }
              }}
              placeholder="10.1038/nature14539 or https://doi.org/…"
              disabled={isLookingUp}
            />
            <Button type="button" variant="secondary" onClick={handleDoiFill} disabled={!doiQuery.trim() || isLookingUp}>
              {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Title, authors, venue, year and citation count are filled automatically.</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          value={publication.title}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Authors *</Label>
        {publication.authors.map((author, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={author}
              onChange={(e) => handleAuthorChange(index, e.target.value)}
              placeholder={`Author ${index + 1}`}
              required={index === 0}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeAuthor(index)}
              disabled={publication.authors.length === 1 && index === 0}
            >
              <XIcon size={16} />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAuthor}
          className="mt-2"
        >
          <PlusIcon size={16} className="mr-2" />
          Add Author
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type *</Label>
          <Select
            value={publication.type}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions(isStudent).map(type => (
                <SelectItem key={type} value={type}>
                  {PUBLICATION_TYPES[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">Year *</Label>
          <Input
            id="year"
            name="year"
            type="number"
            min={1900}
            max={2100}
            value={publication.year}
            onChange={handleYearChange}
            required
          />
        </div>
      </div>

      {(publication.type === 'journal') && (
        <div className="space-y-2">
          <Label htmlFor="journal">Journal</Label>
          <Input
            id="journal"
            name="journal"
            value={publication.journal || ''}
            onChange={handleChange}
          />
        </div>
      )}

      {(publication.type === 'conference') && (
        <div className="space-y-2">
          <Label htmlFor="conference">Conference</Label>
          <Input
            id="conference"
            name="conference"
            value={publication.conference || ''}
            onChange={handleChange}
          />
        </div>
      )}

      {(publication.type === 'book' || publication.type === 'chapter') && (
        <div className="space-y-2">
          <Label htmlFor="book">{PUBLICATION_TYPES[publication.type].venueLabel}</Label>
          <Input id="book" name="book" value={publication.book || ''} onChange={handleChange} />
        </div>
      )}

      {GENERIC_VENUE_TYPES.includes(publication.type) && (
        <div className="space-y-2">
          <Label htmlFor="venue">{PUBLICATION_TYPES[publication.type].venueLabel}</Label>
          <Input id="venue" name="venue" value={publication.venue || ''} onChange={handleChange} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="doi">DOI</Label>
          <Input
            id="doi"
            name="doi"
            value={publication.doi || ''}
            onChange={handleChange}
            placeholder="10.1234/example"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="citations">Citations</Label>
          <Input
            id="citations"
            name="citations"
            type="number"
            min={0}
            value={publication.citations || ''}
            onChange={handleCitationsChange}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          name="url"
          type="url"
          value={publication.url || ''}
          onChange={handleChange}
          placeholder="https://example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="abstract">Abstract</Label>
        <Textarea
          id="abstract"
          name="abstract"
          value={publication.abstract || ''}
          onChange={handleChange}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <div className="flex gap-2">
          <Input
            id="tags"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add a tag and press Enter"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTag}
          >
            Add
          </Button>
        </div>
        {publication.tags && publication.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {publication.tags.map((t) => (
              <div key={t} className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <span>{t}</span>
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="text-secondary-foreground/70 hover:text-secondary-foreground"
                >
                  <XIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update Publication' : 'Add Publication'}
        </Button>
      </div>
    </form>
  );
};

export default PublicationForm;
