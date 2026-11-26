import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface TicketRatingProps {
  value: number | null;
  onRate?: (rating: number) => void;
  disabled?: boolean;
}

/** 1–5 star rating. Read-only when `onRate` is not given. */
const TicketRating = ({ value, onRate, disabled }: TicketRatingProps) => {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const interactive = Boolean(onRate) && !disabled;

  return (
    <div className="flex items-center gap-0.5" role={interactive ? 'radiogroup' : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => setHover(null)}
          role={interactive ? 'radio' : undefined}
          aria-checked={interactive ? value === star : undefined}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          className={cn('p-0.5 transition-transform', interactive && 'hover:scale-110 cursor-pointer')}
        >
          <Star
            className={cn(
              'h-5 w-5 transition-colors',
              star <= shown ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
            )}
          />
        </button>
      ))}
    </div>
  );
};

export default TicketRating;
