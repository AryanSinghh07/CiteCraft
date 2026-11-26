import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';
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
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-64" />
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-80 rounded-xl" />
            </div>
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
