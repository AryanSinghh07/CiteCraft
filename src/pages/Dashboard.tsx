import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import PublicationList from '@/features/publications/components/PublicationList';
import PublicationForm from '@/features/publications/components/PublicationForm';
import PublicationSummary from '@/features/publications/components/PublicationSummary';
import DocumentUpload from '@/features/documents/components/DocumentUpload';
import { usePublications } from '@/features/publications/hooks/usePublications';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Publication } from '@/types';
import { Plus, Book, ChartBar, User as UserIcon, FileText, Info, Pencil, AlertTriangle } from 'lucide-react';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

const Dashboard = () => {
  const { profile, mode } = useAuth();
  const { publications, isLoading, error, refetch, create, update, remove } = usePublications();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('publications');
  const { toast } = useToast();

  const handleAddPublication = async ({ id: _id, createdAt: _c, updatedAt: _u, ...input }: Publication) => {
    try {
      await create.mutateAsync(input);
      setIsAddDialogOpen(false);
      toast({ title: 'Publication added', description: input.title });
    } catch (err) {
      toast({ title: 'Could not add publication', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const handleUpdatePublication = async (publication: Publication) => {
    try {
      await update.mutateAsync(publication);
      toast({ title: 'Publication updated', description: publication.title });
    } catch (err) {
      toast({ title: 'Could not save changes', description: errorMessage(err), variant: 'destructive' });
      throw err;
    }
  };

  const handleDeletePublication = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast({ title: 'Publication deleted' });
    } catch (err) {
      toast({ title: 'Could not delete publication', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const stats = [
    { label: 'Total Publications', value: publications.length },
    { label: 'Journal Articles', value: publications.filter(p => p.type === 'journal').length },
    { label: 'Conference Papers', value: publications.filter(p => p.type === 'conference').length },
    { label: 'Total Citations', value: publications.reduce((sum, p) => sum + (p.citations || 0), 0) },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {mode === 'demo' && (
            <div className="mb-6 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm animate-fade-in">
              <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>
                You're using <strong>demo mode</strong>. Your changes are saved in this browser only.
              </span>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">
                {profile?.name ? `Welcome, ${profile.name.split(' ')[0]}` : 'Dashboard'}
              </h1>
              <p className="text-muted-foreground">Manage your publications and generate summaries</p>
            </div>

            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus size={16} className="mr-2" />
              Add Publication
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
            {stats.map(stat => (
              <Card key={stat.label} className="glass-card">
                <CardHeader className="pb-2">
                  <CardDescription>{stat.label}</CardDescription>
                  {isLoading ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <CardTitle className="text-3xl">{stat.value}</CardTitle>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>

          {error && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <span className="flex-1">Couldn't load your publications: {error.message}</span>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full max-w-md">
              <TabsTrigger value="publications" className="flex items-center gap-2">
                <Book size={16} />
                <span className="hidden sm:inline">Publications</span>
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <ChartBar size={16} />
                <span className="hidden sm:inline">Summary</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText size={16} />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <UserIcon size={16} />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="publications" className="pt-6 animate-fade-in">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="h-56 w-full" />
                  ))}
                </div>
              ) : (
                <PublicationList
                  publications={publications}
                  onUpdate={handleUpdatePublication}
                  onDelete={handleDeletePublication}
                />
              )}
            </TabsContent>

            <TabsContent value="summary" className="pt-6 animate-fade-in">
              <PublicationSummary publications={publications} ownerName={profile?.name} />
            </TabsContent>

            <TabsContent value="documents" className="pt-6 animate-fade-in">
              <div className="max-w-3xl mx-auto">
                <DocumentUpload />
              </div>
            </TabsContent>

            <TabsContent value="profile" className="pt-6 animate-fade-in">
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Your academic profile details</CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/profile">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                      {profile?.photoUrl ? (
                        <img
                          src={profile.photoUrl}
                          alt={profile.name}
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
                        <h2 className="text-2xl font-bold">{profile?.name || 'Your name'}</h2>
                        <p className="text-muted-foreground">{profile?.position || 'Add your position'}</p>
                      </div>

                      {profile?.bio && <p className="text-sm">{profile.bio}</p>}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          ['Email', profile?.email],
                          ['Department', profile?.department],
                          ['Affiliation', profile?.affiliation],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-sm text-muted-foreground">{label}</p>
                            <p>{value || '—'}</p>
                          </div>
                        ))}
                      </div>

                      {profile?.researchInterests && profile.researchInterests.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {profile.researchInterests.map(interest => (
                            <span
                              key={interest}
                              className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
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
            isSubmitting={create.isPending}
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Dashboard;
