
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PublicationList from '@/components/publications/PublicationList';
import PublicationForm from '@/components/publications/PublicationForm';
import PublicationSummary from '@/components/publications/PublicationSummary';
import DocumentUpload from '@/components/documents/DocumentUpload';
import { Publication, User } from '@/utils/types';
import { Plus, Book, ChartBar, User as UserIcon, FileText } from 'lucide-react';
import { samplePublications, sampleUser } from '@/utils/publicationData';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('publications');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('academiaUserData');
    if (!userData) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData) as User;
      setUser(parsedUser);
      
      // In a real app, we would fetch publications from an API
      // For demo purposes, we'll use sample data
      setPublications(samplePublications);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  const handleAddPublication = (publication: Publication) => {
    setPublications([publication, ...publications]);
    setIsAddDialogOpen(false);
  };

  const handleUpdatePublications = (updatedPublications: Publication[]) => {
    setPublications(updatedPublications);
  };

  if (!user) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Manage your publications and generate summaries</p>
            </div>
            
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus size={16} className="mr-2" />
              Add Publication
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardDescription>Total Publications</CardDescription>
                <CardTitle className="text-3xl">{publications.length}</CardTitle>
              </CardHeader>
            </Card>
            
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardDescription>Journal Articles</CardDescription>
                <CardTitle className="text-3xl">
                  {publications.filter(p => p.type === 'journal').length}
                </CardTitle>
              </CardHeader>
            </Card>
            
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardDescription>Conference Papers</CardDescription>
                <CardTitle className="text-3xl">
                  {publications.filter(p => p.type === 'conference').length}
                </CardTitle>
              </CardHeader>
            </Card>
            
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardDescription>Total Citations</CardDescription>
                <CardTitle className="text-3xl">
                  {publications.reduce((sum, pub) => sum + (pub.citations || 0), 0)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full max-w-md">
              <TabsTrigger value="publications" className="flex items-center gap-2">
                <Book size={16} />
                <span>Publications</span>
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <ChartBar size={16} />
                <span>Summary</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText size={16} />
                <span>Documents</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <UserIcon size={16} />
                <span>Profile</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="publications" className="pt-6 animate-fade-in">
              <PublicationList 
                publications={publications} 
                onUpdate={handleUpdatePublications} 
              />
            </TabsContent>
            
            <TabsContent value="summary" className="pt-6 animate-fade-in">
              <PublicationSummary publications={publications} />
            </TabsContent>
            
            <TabsContent value="documents" className="pt-6 animate-fade-in">
              <div className="max-w-3xl mx-auto">
                <DocumentUpload />
              </div>
            </TabsContent>
            
            <TabsContent value="profile" className="pt-6 animate-fade-in">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your academic profile details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                      {user.photoUrl ? (
                        <img 
                          src={user.photoUrl} 
                          alt={user.name} 
                          className="w-32 h-32 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                          <UserIcon size={48} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold">{user.name}</h2>
                        <p className="text-muted-foreground">{user.position}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p>{user.email}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Department</p>
                          <p>{user.department}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Affiliation</p>
                          <p>{user.affiliation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Publication</DialogTitle>
          </DialogHeader>
          <PublicationForm 
            onSubmit={handleAddPublication} 
            onCancel={() => setIsAddDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
