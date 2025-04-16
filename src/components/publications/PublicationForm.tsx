
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Publication } from '@/utils/types';
import { v4 as uuidv4 } from 'uuid';
import { XIcon, PlusIcon } from 'lucide-react';

interface PublicationFormProps {
  initialData?: Publication;
  onSubmit: (publication: Publication) => void;
  onCancel: () => void;
}

const PublicationForm = ({ initialData, onSubmit, onCancel }: PublicationFormProps) => {
  const [publication, setPublication] = useState<Publication>(
    initialData || {
      id: uuidv4(),
      title: '',
      authors: [''],
      year: new Date().getFullYear(),
      type: 'journal',
      tags: [],
    }
  );
  const [tag, setTag] = useState('');

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
      type: value as 'journal' | 'conference' | 'book' | 'chapter' | 'other'
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
    if (!isNaN(value)) {
      setPublication(prev => ({
        ...prev,
        citations: value
      }));
    }
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
    onSubmit(publication);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
              <SelectItem value="journal">Journal Article</SelectItem>
              <SelectItem value="conference">Conference Paper</SelectItem>
              <SelectItem value="book">Book</SelectItem>
              <SelectItem value="chapter">Book Chapter</SelectItem>
              <SelectItem value="other">Other</SelectItem>
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
            placeholder="Add a tag"
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Publication' : 'Add Publication'}
        </Button>
      </div>
    </form>
  );
};

export default PublicationForm;
