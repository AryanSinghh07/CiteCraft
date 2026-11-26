import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LoadingScreen from '@/components/common/LoadingScreen';
import PublicationSummary from '@/features/publications/components/PublicationSummary';
import { usePublications } from '@/features/publications/hooks/usePublications';
import { useAuth } from '@/features/auth/hooks/useAuth';

const Summary = () => {
  const { profile } = useAuth();
  const { publications, isLoading } = usePublications();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Publication Summary</h1>
            <p className="text-muted-foreground">Analyze your publications and generate comprehensive summaries</p>
          </div>

          {isLoading ? (
            <LoadingScreen label="Loading your publications…" fullScreen={false} />
          ) : (
            <PublicationSummary publications={publications} ownerName={profile?.name} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Summary;
