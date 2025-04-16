
import { useState } from 'react';
import { Publication } from '@/utils/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, ExternalLink, Users, Calendar, Award, Hash, ChevronDown, ChevronUp, Edit, Trash
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PublicationCardProps {
  publication: Publication;
  onEdit?: (publication: Publication) => void;
  onDelete?: (id: string) => void;
}

const PublicationCard = ({ publication, onEdit, onDelete }: PublicationCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = () => {
    if (publication.doi) {
      const doiLink = `https://doi.org/${publication.doi}`;
      navigator.clipboard.writeText(doiLink);
      toast({
        title: "Link Copied",
        description: "DOI link has been copied to clipboard"
      });
    } else if (publication.url) {
      navigator.clipboard.writeText(publication.url);
      toast({
        title: "Link Copied",
        description: "URL has been copied to clipboard"
      });
    }
  };

  const getPublicationType = (type: string) => {
    switch (type) {
      case 'journal': return 'Journal Article';
      case 'conference': return 'Conference Paper';
      case 'book': return 'Book';
      case 'chapter': return 'Book Chapter';
      default: return 'Other Publication';
    }
  };

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md glass-card">
      <CardHeader className="pb-2">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="font-normal">
            {getPublicationType(publication.type)}
          </Badge>
          {publication.year && (
            <Badge variant="secondary" className="font-normal">
              {publication.year}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg font-semibold line-clamp-2 hover:line-clamp-none transition-all duration-300">
          {publication.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 pb-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users size={16} />
          <p className="line-clamp-1">{publication.authors.join(', ')}</p>
        </div>
        
        {publication.journal && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen size={16} />
            <p className="line-clamp-1">{publication.journal}</p>
          </div>
        )}
        
        {publication.conference && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar size={16} />
            <p className="line-clamp-1">{publication.conference}</p>
          </div>
        )}
        
        {publication.citations !== undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Award size={16} />
            <p>{publication.citations} citations</p>
          </div>
        )}
        
        {expanded && publication.abstract && (
          <div className="pt-2 pb-4 animate-fade-in">
            <Separator className="mb-4" />
            <h4 className="font-medium mb-2">Abstract</h4>
            <p className="text-sm text-muted-foreground">{publication.abstract}</p>
          </div>
        )}
        
        {expanded && publication.tags && publication.tags.length > 0 && (
          <div className="pt-2 animate-fade-in">
            <h4 className="font-medium mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {publication.tags.map(tag => (
                <div key={tag} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                  <Hash size={12} />
                  <span>{tag}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between pt-4 pb-4">
        <div className="flex gap-2">
          {onEdit && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onEdit(publication)}
              className="text-muted-foreground hover:text-primary"
            >
              <Edit size={16} />
              <span className="sr-only">Edit</span>
            </Button>
          )}
          
          {onDelete && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(publication.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash size={16} />
              <span className="sr-only">Delete</span>
            </Button>
          )}
          
          {(publication.doi || publication.url) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCopyLink}
              className="text-muted-foreground hover:text-primary"
            >
              <ExternalLink size={16} />
              <span className="sr-only">Copy Link</span>
            </Button>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-primary"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="ml-1">{expanded ? "Show Less" : "Show More"}</span>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PublicationCard;
