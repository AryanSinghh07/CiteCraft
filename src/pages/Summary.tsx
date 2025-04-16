
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PublicationSummary from '@/components/publications/PublicationSummary';
import { Publication, User } from '@/utils/types';
import { samplePublications } from '@/utils/publicationData';

const Summary = () => {
  const [user, setUser] = useState<User | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
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

  if (!user) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Publication Summary</h1>
            <p className="text-muted-foreground">
              Analyze your publications and generate comprehensive summaries
            </p>
          </div>
          
          <PublicationSummary publications={publications} />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Summary;
