import { cn } from '@/lib/utils';

interface LogoProps {
  /** badge size in pixels */
  size?: number;
  className?: string;
}

/** The CiteCraft mark (white "C" from the favicon) on the brand-coloured badge. */
const Logo = ({ size = 36, className }: LogoProps) => (
  <span
    className={cn(
      'inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 shadow-sm',
      className,
    )}
    style={{ width: size, height: size }}
  >
    <img
      src="/android-chrome-192x192.png"
      alt=""
      width={Math.round(size * 0.78)}
      height={Math.round(size * 0.78)}
      className="select-none drop-shadow-sm"
      draggable={false}
    />
  </span>
);

export default Logo;
