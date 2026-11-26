import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, SearchX } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="relative text-center space-y-6 animate-scale-in">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-float">
          <SearchX className="h-10 w-10" />
        </div>
        <div>
          <p className="text-7xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">404</p>
          <h1 className="mt-2 text-2xl font-semibold">This page doesn't exist</h1>
          <p className="mt-2 text-muted-foreground">The link may be broken, or the page may have moved.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go back
          </Button>
          <Button asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" /> Home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
