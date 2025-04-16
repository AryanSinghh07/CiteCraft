
import { useState } from 'react';
import { Publication } from '@/utils/types';
import PublicationCard from './PublicationCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Filter, SortAsc, SortDesc, RefreshCw } from 'lucide-react';
import PublicationForm from './PublicationForm';

interface PublicationListProps {
  publications: Publication[];
  onUpdate: (publications: Publication[]) => void;
}

const PublicationList = ({ publications, onUpdate }: PublicationListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleSortOrderToggle = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleEdit = (publication: Publication) => {
    setEditingPublication(publication);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      const updatedPublications = publications.filter(pub => pub.id !== deleteId);
      onUpdate(updatedPublications);
      setIsDeleteDialogOpen(false);
    }
  };

  const handlePublicationUpdate = (updatedPublication: Publication) => {
    const updatedPublications = publications.map(pub => 
      pub.id === updatedPublication.id ? updatedPublication : pub
    );
    onUpdate(updatedPublications);
    setIsEditDialogOpen(false);
    setEditingPublication(null);
  };

  // Filter and sort publications
  const displayedPublications = [...publications]
    .filter(pub => {
      const matchesSearch = 
        pub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pub.authors.some(author => author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (pub.abstract && pub.abstract.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (pub.journal && pub.journal.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (pub.conference && pub.conference.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = 
        filterType === 'all' || 
        pub.type === filterType;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'year') {
        return sortOrder === 'asc' ? a.year - b.year : b.year - a.year;
      } else if (sortBy === 'citations') {
        const citationsA = a.citations || 0;
        const citationsB = b.citations || 0;
        return sortOrder === 'asc' ? citationsA - citationsB : citationsB - citationsA;
      } else if (sortBy === 'title') {
        return sortOrder === 'asc' 
          ? a.title.localeCompare(b.title) 
          : b.title.localeCompare(a.title);
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search publications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <div className="flex items-center">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[180px]">
                <div className="flex items-center gap-2">
                  <Filter size={16} />
                  <SelectValue placeholder="Filter by" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="journal">Journal Articles</SelectItem>
                <SelectItem value="conference">Conference Papers</SelectItem>
                <SelectItem value="book">Books</SelectItem>
                <SelectItem value="chapter">Book Chapters</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px]">
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} />
                  <SelectValue placeholder="Sort by" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="citations">Citations</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" size="icon" onClick={handleSortOrderToggle}>
            {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
          </Button>
        </div>
      </div>
      
      {displayedPublications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No publications found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPublications.map(publication => (
            <PublicationCard 
              key={publication.id} 
              publication={publication} 
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Publication</DialogTitle>
          </DialogHeader>
          {editingPublication && (
            <PublicationForm 
              initialData={editingPublication} 
              onSubmit={handlePublicationUpdate} 
              onCancel={() => setIsEditDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the publication.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PublicationList;
