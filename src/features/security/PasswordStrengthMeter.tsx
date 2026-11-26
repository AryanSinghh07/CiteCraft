import { cn } from '@/lib/utils';
import { passwordStrength } from './passwordStrength';

const COLORS = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'];
const TEXT = ['text-red-600', 'text-orange-600', 'text-amber-600', 'text-emerald-600', 'text-emerald-700'];

/** Four-segment strength bar with tips; renders nothing until the user starts typing. */
const PasswordStrengthMeter = ({ password, context = [] }: { password: string; context?: string[] }) => {
  if (!password) return null;
  const s = passwordStrength(password, context);
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full transition-all duration-300', i < Math.max(1, s.score) ? COLORS[s.score] : 'w-0')} style={{ width: i < Math.max(1, s.score) ? '100%' : '0%' }} />
          </div>
        ))}
      </div>
      <p className="text-xs">
        <span className={cn('font-medium', TEXT[s.score], 'dark:brightness-125')}>{s.label}</span>
        {s.tips[0] && <span className="text-muted-foreground"> — {s.tips[0]}</span>}
      </p>
    </div>
  );
};

export default PasswordStrengthMeter;
