import { Link } from 'react-router-dom';
import { Book, Github, Linkedin } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';

const Footer = () => {
  const { user } = useAuth();

  const product = user
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/summary', label: 'Summary' },
        { to: '/cv', label: 'Printable CV' },
      ]
    : [
        { to: '/', label: 'Home' },
        { to: '/signup', label: 'Create account' },
        { to: '/login', label: 'Sign in' },
      ];

  const help = [
    { to: user ? '/support' : '/login', label: 'Help & support' },
    { to: '/forgot-password', label: 'Reset password' },
  ];

  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 text-xl font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Book className="h-4 w-4" />
              </span>
              CiteCraft
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Manage, analyse and showcase your academic publications — all in one place.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/AryanSinghh07/CiteCraft"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:text-primary hover:border-primary/40"
              >
                <Github className="h-4 w-4" />
                <span className="sr-only">CiteCraft on GitHub</span>
              </a>
              <a
                href="https://in.linkedin.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:text-primary hover:border-primary/40"
              >
                <Linkedin className="h-4 w-4" />
                <span className="sr-only">LinkedIn</span>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Product</h4>
            <ul className="space-y-2.5">
              {product.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Help</h4>
            <ul className="space-y-2.5">
              {help.map(link => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row justify-between gap-2 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CiteCraft. All rights reserved.</p>
          <p>Made for researchers, by researchers.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
