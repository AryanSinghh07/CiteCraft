
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Book, User, Home, LogOut, Menu, X } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';

const Navbar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in based on localStorage
    const userData = localStorage.getItem('academiaUserData');
    setIsLoggedIn(!!userData);

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('academiaUserData');
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  const NavItem = ({ to, label, icon: Icon }: { to: string; label: string; icon: React.ElementType }) => (
    <Link 
      to={to} 
      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-300 ${
        location.pathname === to 
          ? 'bg-primary/10 text-primary font-medium' 
          : 'hover:bg-primary/5 text-foreground/80 hover:text-primary'
      }`}
      onClick={() => setIsMenuOpen(false)}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );

  return (
    <header 
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'glass-morphism py-2' : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-xl font-semibold"
            onClick={() => setIsMenuOpen(false)}
          >
            <Book className="text-primary" />
            <span className="animate-fade-in">CiteCraft</span>
          </Link>

          {isMobile ? (
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="relative z-50"
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
              
              {isMenuOpen && (
                <div className="fixed inset-0 glass-morphism z-40 animate-fade-in">
                  <div className="flex flex-col pt-20 p-6 h-full">
                    <div className="flex flex-col gap-4">
                      <NavItem to="/" label="Home" icon={Home} />
                      {isLoggedIn ? (
                        <>
                          <NavItem to="/dashboard" label="Dashboard" icon={Book} />
                          <NavItem to="/profile" label="Profile" icon={User} />
                          <Button 
                            variant="ghost" 
                            className="flex items-center gap-2 w-full justify-start px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={handleLogout}
                          >
                            <LogOut size={18} />
                            <span>Logout</span>
                          </Button>
                        </>
                      ) : (
                        <NavItem to="/login" label="Login" icon={User} />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <nav className="flex items-center gap-4">
              <NavItem to="/" label="Home" icon={Home} />
              {isLoggedIn ? (
                <>
                  <NavItem to="/dashboard" label="Dashboard" icon={Book} />
                  <NavItem to="/profile" label="Profile" icon={User} />
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </Button>
                </>
              ) : (
                <Button asChild className="button-hover">
                  <Link to="/login">Login</Link>
                </Button>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
