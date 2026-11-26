import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ThemeToggle from '@/components/common/ThemeToggle';
import Logo from '@/components/common/Logo';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  BarChart3,
  Book,
  BookMarked,
  ExternalLink,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Printer,
  Quote,
  School,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';

interface NavEntry {
  to: string;
  label: string;
  icon: typeof Book;
}

const initials = (name?: string, email?: string) =>
  (name || email || '?')
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation; lock page scroll while it is open.
  useEffect(() => setIsMenuOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  const links: NavEntry[] = user
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        profile?.accountType === 'student'
          ? { to: '/college', label: 'College', icon: School }
          : { to: '/summary', label: 'Insights', icon: BarChart3 },
        { to: '/reading-list', label: 'Reading list', icon: BookMarked },
        { to: '/summarize', label: 'Summarize', icon: Sparkles },
        { to: '/support', label: 'Support', icon: LifeBuoy },
        ...(isAdmin ? [{ to: '/admin/tickets', label: 'Admin', icon: ShieldCheck }] : []),
      ]
    : [{ to: '/cite', label: 'Cite', icon: Quote }];

  const publicUrl = profile?.isPublic && profile.publicSlug ? `/u/${profile.publicSlug}` : null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'text-primary' : 'text-foreground/70 hover:text-foreground hover:bg-muted/60',
    );

  return (
    <header
      className={cn(
        'fixed top-0 left-0 w-full z-50 transition-all duration-300',
        isScrolled || isMenuOpen
          ? 'bg-background/80 backdrop-blur-lg border-b border-border/60 shadow-sm py-2'
          : 'bg-transparent py-4',
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link to={user ? '/dashboard' : '/'} className="group flex items-center gap-2 text-xl font-semibold">
            <Logo size={36} className="transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-105" />
            <span>CiteCraft</span>
          </Link>

          {/* Desktop */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            {links.map(link => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {({ isActive }) => (
                  <>
                    <link.icon className="h-4 w-4" />
                    {link.label}
                    <span
                      className={cn(
                        'absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary transition-transform duration-300 origin-left',
                        isActive ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <ThemeToggle />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="hidden md:flex ml-1 h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary ring-2 ring-transparent transition hover:ring-primary/40 focus:outline-none focus-visible:ring-primary"
                    aria-label="Account menu"
                  >
                    {profile?.photoUrl ? (
                      <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(profile?.name, user.email)
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <p className="font-medium truncate">{profile?.name || 'Your account'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User className="mr-2 h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  {publicUrl && (
                    <DropdownMenuItem asChild>
                      <Link to={publicUrl}>
                        <ExternalLink className="mr-2 h-4 w-4" /> Public profile
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/security">
                      <Shield className="mr-2 h-4 w-4" /> Security
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/cv">
                      <Printer className="mr-2 h-4 w-4" /> Printable CV
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/cite">
                      <Quote className="mr-2 h-4 w-4" /> Citation generator
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-2 ml-1">
                <Button asChild variant="ghost">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild className="shadow-sm">
                  <Link to="/signup">Get started</Link>
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(open => !open)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'md:hidden fixed inset-x-0 top-[57px] bottom-0 bg-background/95 backdrop-blur-lg transition-all duration-300',
          isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none',
        )}
      >
        <nav
          className={cn(
            'container mx-auto px-4 py-6 flex flex-col gap-1 transition-transform duration-300',
            isMenuOpen ? 'translate-y-0' : '-translate-y-4',
          )}
          aria-label="Mobile"
        >
          {user ? (
            <>
              <div className="flex items-center gap-3 px-3 pb-4 mb-2 border-b">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary">
                  {profile?.photoUrl ? (
                    <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(profile?.name, user.email)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{profile?.name || 'Your account'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              {[...links, { to: '/profile', label: 'Profile', icon: User }, { to: '/security', label: 'Security', icon: Shield }, { to: '/cv', label: 'Printable CV', icon: Printer }, { to: '/cite', label: 'Citation generator', icon: Quote }].map(
                (link, i) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-3 text-base transition-colors',
                        isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted',
                      )
                    }
                    style={{ transitionDelay: isMenuOpen ? `${i * 30}ms` : undefined }}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </NavLink>
                ),
              )}
              <button
                onClick={handleLogout}
                className="mt-2 flex items-center gap-3 rounded-md px-3 py-3 text-base text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" /> Sign out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Button asChild size="lg">
                <Link to="/signup">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
