import { useId } from 'react';

interface SparklineProps {
  values: number[];
  className?: string;
  /** CSS colour, e.g. "hsl(var(--chart-1))" */
  color?: string;
}

/** Tiny trend line with a soft fill, for stat cards. Decorative only. */
const Sparkline = ({ values, className, color = 'hsl(var(--primary))' }: SparklineProps) => {
  const id = useId();
  if (values.length < 2) return null;
  const width = 100;
  const height = 32;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const points = values.map((v, i) => [i * step, height - 2 - (v / max) * (height - 6)] as const);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export default Sparkline;
