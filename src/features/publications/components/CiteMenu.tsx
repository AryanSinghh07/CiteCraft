import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { Publication } from '@/types';
import { Quote } from 'lucide-react';
import { CITATION_STYLES, formatCitation, type CitationStyle } from '../utils/citations';

/** Copy one publication's citation in APA, MLA or IEEE. */
const CiteMenu = ({ publication }: { publication: Publication }) => {
  const { toast } = useToast();

  const copy = async (style: CitationStyle) => {
    const text = formatCitation(publication, style);
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${CITATION_STYLES[style]} citation copied`, description: text });
    } catch {
      toast({ title: 'Copy failed', description: 'Your browser blocked clipboard access.', variant: 'destructive' });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" aria-label="Cite">
          <Quote size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Copy citation</DropdownMenuLabel>
        {(Object.keys(CITATION_STYLES) as CitationStyle[]).map(style => (
          <DropdownMenuItem key={style} onSelect={() => copy(style)}>
            {CITATION_STYLES[style]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CiteMenu;
