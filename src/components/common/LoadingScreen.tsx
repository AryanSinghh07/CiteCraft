import { Book } from 'lucide-react';

interface LoadingScreenProps {
  label?: string;
  /** fill the whole viewport (route guards) or just a section */
  fullScreen?: boolean;
}

const LoadingScreen = ({ label = 'Loading…', fullScreen = true }: LoadingScreenProps) => (
  <div
    className={`${fullScreen ? 'min-h-screen' : 'py-24'} flex flex-col items-center justify-center gap-4`}
    role="status"
  >
    <div className="relative">
      <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <Book className="absolute inset-0 m-auto h-5 w-5 text-primary" />
    </div>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

export default LoadingScreen;
