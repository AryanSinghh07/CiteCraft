import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import StatCard from '@/components/common/StatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import PublicationList from '@/features/publications/components/PublicationList';
import PublicationForm from '@/features/publications/components/PublicationForm';
import DocumentUpload from '@/features/documents/components/DocumentUpload';
import ImportDialog from '@/features/publications/components/ImportDialog';
import ExportMenu from '@/features/publications/components/ExportMenu';
import ProfileStrength from '@/features/dashboard/components/ProfileStrength';
import StudentHub from '@/features/student/components/StudentHub';
import { PUBLICATION_TYPES } from '@/features/publications/utils/publicationTypes';
import { usePublications } from '@/features/publications/hooks/usePublications';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { researchMetrics, yearSeries } from '@/utils/metrics';
import type { Publication, PublicationInput } from '@/types';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Book,
  BookMarked,
  Clock,
  FileText,
  Info,
  Plus,
  Quote,
  Sparkles,
  Trophy,
  Upload,
  User as UserIcon,
} from 'lucide-react';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};


const Dashboard = () => {
  const { profile, mode } = useAuth();
  const { publications, isLoading, error, refetch, create, createMany, update, remove } = usePublications();
  const { documents } = useDocuments();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('publications');
  const { toast } = useToast();

  const metrics = useMemo(() => researchMetrics(publications), [publications]);
  const series = useMemo(() => yearSeries(publications).slice(-8), [publications]);
  const recent = useMemo(
    () => [...publications].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 4),
    [publications],
  );
  const thisYear = new Date().getFullYear();
  const publishedThisYear = publications.filter(p => p.year === thisYear).length;

  const handleAddPublication = async ({ id: _id, createdAt: _c, updatedAt: _u, ...input }: Publication) => {
    try {
      await create.mutateAsync(input);
      setIsAddDialogOpen(false);
      toast({ title: 'Publication added', description: input.title });
    } catch (err) {
      toast({ title: 'Could not add publication', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const handleImport = async (inputs: PublicationInput[]) => {
    try {
      const created = await createMany.mutateAsync(inputs);
      toast({ title: `Imported ${created.length} ${created.length === 1 ? 'publication' : 'publications'}` });
    } catch (err) {
      toast({ title: 'Import failed', description: errorMessage(err), variant: 'destructive' });
      throw err;
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

  const firstName = profile?.name?.split(' ')[0];
  const isStudent = profile?.accountType === 'student';
  const workLabel = isStudent ? 'My work' : 'Publications';

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

          {/* Welcome banner */}
          <section className="relative mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-purple-500/10 p-6 sm:p-8 animate-fade-up">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/15 text-xl font-bold text-primary ring-4 ring-background shadow">
                  {profile?.photoUrl ? (
                    <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (firstName?.[0] ?? <UserIcon className="h-7 w-7" />)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{greeting()}</p>
                  <h1 className="text-2xl sm:text-3xl font-bold truncate">{firstName ? `${firstName}, welcome back` : 'Welcome back'}</h1>
                  <p className="text-sm text-muted-foreground truncate">
                    {(isStudent
                      ? [profile?.program, profile?.yearOfStudy, profile?.affiliation]
                      : [profile?.position, profile?.affiliation]
                    )
                      .filter(Boolean)
                      .join(' · ') || 'Complete your profile to get started'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setIsAddDialogOpen(true)} className="shadow-md shadow-primary/20">
                  <Plus className="mr-2 h-4 w-4" /> {isStudent ? 'Add work' : 'Add publication'}
                </Button>
                <Button variant="outline" onClick={() => setIsImportOpen(true)} className="bg-background/60">
                  <Upload className="mr-2 h-4 w-4" /> Import
                </Button>
                <ExportMenu publications={publications} />
              </div>
            </div>
          </section>

          {/* Students: daily college overview. Researchers: research metrics. */}
          {isStudent && <StudentHub />}
          <div className={isStudent ? 'hidden' : 'grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'}>
            <StatCard
              label={workLabel}
              value={publications.length}
              icon={FileText}
              color="hsl(var(--chart-1))"
              loading={isLoading}
              trend={series.map(s => s.publications)}
              caption={publishedThisYear ? `${publishedThisYear} in ${thisYear}` : 'total in your library'}
            />
            <StatCard
              label="Citations"
              value={metrics.totalCitations}
              icon={Quote}
              color="hsl(var(--chart-2))"
              loading={isLoading}
              trend={series.map(s => s.citations)}
              caption={`${metrics.averageCitations.toFixed(1)} per paper`}
              style={{ animationDelay: '60ms' }}
            />
            <StatCard
              label="h-index"
              value={metrics.hIndex}
              icon={Award}
              color="hsl(var(--chart-3))"
              loading={isLoading}
              hint="You have h papers with at least h citations each."
              caption="Hirsch index"
              style={{ animationDelay: '120ms' }}
            />
            <StatCard
              label="i10-index"
              value={metrics.i10Index}
              icon={Trophy}
              color="hsl(var(--chart-4))"
              loading={isLoading}
              hint="Number of papers with at least 10 citations."
              caption="papers with 10+ citations"
              style={{ animationDelay: '180ms' }}
            />
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

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* Main */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
              <TabsList className="h-auto rounded-xl bg-muted/70 p-1">
                <TabsTrigger value="publications" className="gap-2 rounded-lg px-4 py-2 data-[state=active]:shadow-sm">
                  <Book className="h-4 w-4" /> {workLabel}
                  <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">{publications.length}</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2 rounded-lg px-4 py-2 data-[state=active]:shadow-sm">
                  <FileText className="h-4 w-4" /> Documents
                  {documents.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">{documents.length}</span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="publications" className="pt-6 animate-fade-in">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {Array.from({ length: 4 }, (_, i) => (
                      <Skeleton key={i} className="h-56 w-full rounded-xl" />
                    ))}
                  </div>
                ) : publications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-float">
                      <Book className="h-7 w-7" />
                    </div>
                    <h2 className="text-lg font-semibold">Your library is empty</h2>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      {isStudent
                        ? 'Add your projects, theses, reports or papers — or ask the assistant (bottom-right) to help.'
                        : 'Add a publication by DOI, import a BibTeX file, or ask the assistant (bottom-right) to add one for you.'}
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add publication
                      </Button>
                      <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" /> Import
                      </Button>
                    </div>
                  </div>
                ) : (
                  <PublicationList
                    publications={publications}
                    onUpdate={handleUpdatePublication}
                    onDelete={handleDeletePublication}
                  />
                )}
              </TabsContent>

              <TabsContent value="documents" className="pt-6 animate-fade-in">
                <div className="max-w-3xl">
                  <DocumentUpload />
                </div>
              </TabsContent>
            </Tabs>

            {/* Sidebar */}
            <aside className="space-y-6">
              <ProfileStrength profile={profile} publicationCount={publications.length} />

              <Card className="animate-fade-up [animation-delay:80ms]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Recently added
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {recent.map(p => (
                        <li key={p.id} className="flex gap-3">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug line-clamp-2">{p.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {PUBLICATION_TYPES[p.type].short} · {p.year}
                              {(p.citations ?? 0) > 0 && ` · ${p.citations} citations`}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Link
                to="/summary"
                className="group block rounded-xl border bg-card p-5 hover-lift animate-fade-up [animation-delay:160ms]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BarChart3 className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">Research insights</p>
                    <p className="text-xs text-muted-foreground">Trends, venues, collaborators and topics</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              <Link
                to="/reading-list"
                className="group block rounded-xl border bg-card p-5 hover-lift animate-fade-up [animation-delay:200ms]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookMarked className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">Reading list</p>
                    <p className="text-xs text-muted-foreground">Papers you're reading, with notes and citations</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              <Link
                to="/summarize"
                className="group block overflow-hidden rounded-xl bg-gradient-to-br from-primary to-purple-600 p-5 text-white shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 animate-fade-up [animation-delay:240ms]"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">Summarize a document</p>
                    <p className="mt-1 text-sm text-white/80">
                      Upload a paper, thesis or slides and get a clear AI summary in seconds.
                    </p>
                  </div>
                </div>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium">
                  Try it <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </p>
              </Link>
            </aside>
          </div>
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

      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        existing={publications}
        onImport={handleImport}
        isImporting={createMany.isPending}
      />

      <Footer />
    </div>
  );
};

export default Dashboard;
