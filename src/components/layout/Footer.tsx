
import { Link } from 'react-router-dom';
import { Book, Github, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="mt-auto py-8 border-t border-border/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 text-xl font-semibold">
              <Book className="text-primary" />
              <span>CiteCraft</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              A powerful publications management and summary generator for faculty members.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-4">Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Support
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Connect</h4>
            <div className="flex space-x-4">
              <a href="https://github.com/" className="text-muted-foreground hover:text-primary transition-colors">
                <Github size={20} />
                <span className="sr-only">GitHub</span>
              </a>
              <a href="https://in.linkedin.com/" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin size={20} />
                <span className="sr-only">LinkedIn</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border/40 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CiteCraft. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
