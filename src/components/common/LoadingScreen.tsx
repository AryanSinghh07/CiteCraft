import Logo from './Logo';

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
      <Logo size={28} className="absolute inset-0 m-auto" />
    </div>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

export default LoadingScreen;
