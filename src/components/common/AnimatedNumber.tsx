import { useCountUp } from '@/hooks/useCountUp';

interface AnimatedNumberProps {
  value: number;
  /** digits after the decimal point */
  decimals?: number;
  className?: string;
}

/** A number that counts up to its value; screen readers get the final value. */
const AnimatedNumber = ({ value, decimals = 0, className }: AnimatedNumberProps) => {
  const current = useCountUp(value);
  const format = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <span className={className}>
      <span aria-hidden className="tabular-nums">
        {format(current)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
};

export default AnimatedNumber;
