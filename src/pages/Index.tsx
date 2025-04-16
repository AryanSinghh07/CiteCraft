
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Book, Search, BarChart, FileText, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';

const Index = () => {
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
            entry.target.classList.remove('opacity-0');
          }
        });
      },
      { threshold: 0.1 }
    );

    const fadeElements = document.querySelectorAll('.fade-in-element');
    fadeElements.forEach((el) => {
      observer.observe(el);
    });

    return () => {
      fadeElements.forEach((el) => {
        observer.unobserve(el);
      });
    };
  }, []);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow pt-24">
        {/* Hero Section - Enhanced with more visual elements */}
        <section className="bg-gradient-to-b from-background to-muted/30 py-20 md:py-32 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col items-center text-center space-y-8 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium animate-fade-in">
                <Sparkles className="h-4 w-4" />
                Introducing CiteCraft
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight animate-fade-in">
                <span className="block">Elevate Your Academic</span>
                <span className="block bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Publication Profile</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
                A sophisticated tool for faculty members to manage, analyze, and showcase their publication records with elegant visualizations and powerful summaries.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-fade-in">
                <Button asChild size="lg" className="font-medium">
                  <Link to="/login">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" onClick={scrollToFeatures} className="font-medium">
                  Explore Features
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section - Enhanced with better cards and animations */}
        <section ref={featuresRef} className="py-20 bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 opacity-0 fade-in-element">Comprehensive Publication Management</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto opacity-0 fade-in-element">
                Everything you need to organize, analyze, and showcase your academic publications in one elegant platform.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-background rounded-lg p-6 border border-border/50 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 opacity-0 fade-in-element">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Book className="text-primary h-6 w-6" />
                </div>
                <h3 className="text-xl font-medium mb-2">Publication Tracking</h3>
                <p className="text-muted-foreground">
                  Easily manage and organize all your academic publications in one centralized location.
                </p>
              </div>
              
              <div className="bg-background rounded-lg p-6 border border-border/50 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 opacity-0 fade-in-element">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Search className="text-primary h-6 w-6" />
                </div>
                <h3 className="text-xl font-medium mb-2">Advanced Search</h3>
                <p className="text-muted-foreground">
                  Quickly find and filter your publications by journal, conference, year, or custom tags.
                </p>
              </div>
              
              <div className="bg-background rounded-lg p-6 border border-border/50 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 opacity-0 fade-in-element">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart className="text-primary h-6 w-6" />
                </div>
                <h3 className="text-xl font-medium mb-2">Visual Analytics</h3>
                <p className="text-muted-foreground">
                  Generate beautiful visualizations showcasing your publication timeline and impact metrics.
                </p>
              </div>
              
              <div className="bg-background rounded-lg p-6 border border-border/50 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 opacity-0 fade-in-element">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="text-primary h-6 w-6" />
                </div>
                <h3 className="text-xl font-medium mb-2">Summary Generation</h3>
                <p className="text-muted-foreground">
                  Create comprehensive publication summaries for CV, tenure applications, or annual reviews.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section - Enhanced with better styling */}
        <section className="bg-gradient-to-b from-muted/30 to-background py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-6 opacity-0 fade-in-element">
              <h2 className="text-3xl font-bold">Ready to showcase your academic achievements?</h2>
              <p className="text-xl text-muted-foreground">
                Join Academia today and transform how you manage and present your publication record.
              </p>
              <Button asChild size="lg" className="mt-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-md">
                <Link to="/login">
                  Get Started Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
