import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Info, type LucideIcon } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import Sparkline from './Sparkline';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  /** e.g. "hsl(var(--chart-2))" */
  color?: string;
  decimals?: number;
  caption?: ReactNode;
  hint?: string;
  trend?: number[];
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** A headline number with icon, optional explanation tooltip and sparkline. */
const StatCard = ({
  label,
  value,
  icon: Icon,
  color = 'hsl(var(--chart-1))',
  decimals = 0,
  caption,
  hint,
  trend,
  loading,
  className,
  style,
}: StatCardProps) => (
  <div
    className={cn(
      'group relative overflow-hidden rounded-xl border bg-card p-4 sm:p-5 shadow-sm hover-lift animate-fade-up',
      className,
    )}
    style={style}
  >
    <div
      className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
      style={{ background: color }}
      aria-hidden
    />
    <div className="flex items-start justify-between gap-2">
      <p className="flex items-center gap-1 text-sm text-muted-foreground">
        {label}
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={`What is ${label}?`} className="opacity-50 hover:opacity-100">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px]">{hint}</TooltipContent>
          </Tooltip>
        )}
      </p>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
    </div>
    {loading ? (
      <Skeleton className="mt-2 h-8 w-20" />
    ) : (
      <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
        <AnimatedNumber value={value} decimals={decimals} />
      </p>
    )}
    <div className="mt-1 flex items-end justify-between gap-2 min-h-[20px]">
      {caption && <p className="text-xs text-muted-foreground truncate">{caption}</p>}
      {trend && trend.length > 1 && <Sparkline values={trend} color={color} className="ml-auto h-6 w-20 shrink-0" />}
    </div>
  </div>
);

export default StatCard;
