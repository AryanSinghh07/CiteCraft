import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Coffee, Pause, Play, RotateCcw, Timer } from 'lucide-react';

type Mode = 'focus' | 'short' | 'long';
const MODES: Record<Mode, { label: string; minutes: number }> = {
  focus: { label: 'Focus', minutes: 25 },
  short: { label: 'Short break', minutes: 5 },
  long: { label: 'Long break', minutes: 15 },
};
const STATS_KEY = 'citecraft:focus-stats';

const today = () => new Date().toISOString().slice(0, 10);
function loadToday(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) ?? '{}') as { date?: string; sessions?: number };
    return raw.date === today() ? raw.sessions ?? 0 : 0;
  } catch {
    return 0;
  }
}

/** Pomodoro-style study timer. Completed focus sessions are counted per day in this browser. */
const FocusTimer = ({ compact = false }: { compact?: boolean }) => {
  const [mode, setMode] = useState<Mode>('focus');
  const [left, setLeft] = useState(MODES.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(loadToday);
  const endAt = useRef<number | null>(null);
  const originalTitle = useRef(document.title);

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round(((endAt.current ?? 0) - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        setRunning(false);
        if (mode === 'focus') {
          setSessions(n => {
            const next = n + 1;
            try {
              localStorage.setItem(STATS_KEY, JSON.stringify({ date: today(), sessions: next }));
            } catch {
              /* ignore */
            }
            return next;
          });
          switchMode('short');
        } else {
          switchMode('focus');
        }
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Show the countdown in the browser tab while running.
  useEffect(() => {
    const title = originalTitle.current;
    if (running) document.title = `${format(left)} · ${MODES[mode].label}`;
    else document.title = title;
    return () => {
      document.title = title;
    };
  }, [left, running, mode]);

  function switchMode(next: Mode) {
    setMode(next);
    setLeft(MODES[next].minutes * 60);
  }
  const format = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const total = MODES[mode].minutes * 60;
  const progress = 1 - left / total;
  const r = compact ? 42 : 70;
  const c = 2 * Math.PI * r;
  const size = (r + 10) * 2;

  return (
    <div className={cn('flex flex-col items-center', compact ? 'gap-3' : 'gap-5')}>
      {!compact && (
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {(Object.keys(MODES) as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setRunning(false);
                switchMode(m);
              }}
              className={cn('rounded-full px-3 py-1 text-sm transition-colors', mode === m ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground')}
              aria-pressed={mode === m}
            >
              {MODES[m].label}
            </button>
          ))}
        </div>
      )}
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={compact ? 6 : 8} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={mode === 'focus' ? 'hsl(var(--primary))' : 'hsl(var(--chart-3))'}
            strokeWidth={compact ? 6 : 8}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-500 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold tabular-nums', compact ? 'text-xl' : 'text-4xl')} role="timer" aria-live="off">
            {format(left)}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {mode === 'focus' ? <Timer className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
            {MODES[mode].label}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size={compact ? 'sm' : 'default'} onClick={() => setRunning(r => !r)} className="min-w-[96px]">
          {running ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}
          {running ? 'Pause' : left < total ? 'Resume' : 'Start'}
        </Button>
        <Button
          size={compact ? 'sm' : 'default'}
          variant="outline"
          onClick={() => {
            setRunning(false);
            setLeft(total);
          }}
          aria-label="Reset timer"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {sessions} focus session{sessions === 1 ? '' : 's'} today{sessions >= 4 ? ' — great work! 🎉' : ''}
      </p>
    </div>
  );
};

export default FocusTimer;
