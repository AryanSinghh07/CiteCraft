import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/common/AnimatedNumber';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUpdateProfile } from '@/features/profile/hooks/useUpdateProfile';
import { Calculator, GraduationCap, Plus, Target, Trash2 } from 'lucide-react';
import { useGrades } from '../hooks';
import { GRADE_SCALES, cgpa, cgpaToPercentage, requiredSgpa, semesterGpas } from '../utils';

/** One "add a course" row inside a semester card. */
const AddRow = ({ semester, scale, onAdd }: { semester: number; scale: 4 | 10; onAdd: (row: { courseName: string; credits: number; letter: string; gradePoint: number }) => Promise<void> }) => {
  const [name, setName] = useState('');
  const [credits, setCredits] = useState('3');
  const [letter, setLetter] = useState(GRADE_SCALES[scale][1].letter);
  const grade = GRADE_SCALES[scale].find(g => g.letter === letter) ?? GRADE_SCALES[scale][0];

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const c = Number(credits);
        if (!name.trim() || !(c > 0)) return;
        await onAdd({ courseName: name.trim(), credits: c, letter: grade.letter, gradePoint: grade.point });
        setName('');
      }}
      className="grid grid-cols-[1fr_64px_80px_auto] gap-2 pt-2"
      aria-label={`Add a course to semester ${semester}`}
    >
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Course" maxLength={120} className="h-9" aria-label="Course name" />
      <Input value={credits} onChange={e => setCredits(e.target.value)} type="number" min={0.5} max={40} step={0.5} className="h-9" aria-label="Credits" />
      <Select value={letter} onValueChange={setLetter}>
        <SelectTrigger className="h-9" aria-label="Grade">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GRADE_SCALES[scale].map(g => (
            <SelectItem key={g.letter} value={g.letter}>
              {g.letter} ({g.point})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="icon" className="h-9 w-9" disabled={!name.trim()} aria-label="Add course">
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
};

/** SGPA / CGPA calculator with a target planner. */
const GradesTab = () => {
  const { profile } = useAuth();
  const updateProfile = useUpdateProfile();
  const { items: grades, isLoading, create, remove } = useGrades();
  const { toast } = useToast();
  const scale: 4 | 10 = profile?.gradeScale === 4 ? 4 : 10;
  const [extraSemesters, setExtraSemesters] = useState<number[]>([]);
  const [target, setTarget] = useState(scale === 10 ? '8.5' : '3.5');
  const [nextCredits, setNextCredits] = useState('22');

  const semesters = useMemo(() => semesterGpas(grades), [grades]);
  const overall = useMemo(() => cgpa(grades), [grades]);
  const semesterNumbers = [...new Set([...semesters.map(s => s.semester), ...extraSemesters])].sort((a, b) => a - b);
  const needed = grades.length ? requiredSgpa(grades, Number(target), Number(nextCredits), scale) : null;

  const add = (semester: number) => async (row: { courseName: string; credits: number; letter: string; gradePoint: number }) => {
    try {
      await create.mutateAsync({ semester, ...row });
    } catch (error) {
      toast({ title: 'Could not add', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    }
  };

  if (isLoading) return <Skeleton className="h-80 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-purple-600 p-6 text-white shadow-lg">
          <GraduationCap className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10" aria-hidden />
          <p className="text-sm text-white/80">Your CGPA</p>
          <p className="text-5xl font-bold tracking-tight">
            {grades.length ? <AnimatedNumber value={overall.gpa} decimals={2} /> : '—'}
            <span className="text-lg font-medium text-white/70"> / {scale}</span>
          </p>
          <p className="mt-1 text-sm text-white/80">
            {grades.length
              ? `${overall.credits} credits · ${semesters.length} semester${semesters.length === 1 ? '' : 's'}${scale === 10 ? ` · ≈ ${cgpaToPercentage(overall.gpa).toFixed(1)}%` : ''}`
              : 'Add your grades below to calculate it.'}
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-white/80">Scale:</span>
            {([10, 4] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => updateProfile.mutate({ patch: { gradeScale: s } })}
                className={cn('rounded-full px-3 py-0.5 transition-colors', scale === s ? 'bg-white text-primary font-semibold' : 'bg-white/15 hover:bg-white/25')}
                aria-pressed={scale === s}
              >
                {s}-point
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <p className="flex items-center gap-2 font-semibold">
            <Target className="h-4 w-4 text-primary" /> Target planner
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="target-cgpa" className="text-xs">Target CGPA</Label>
              <Input id="target-cgpa" type="number" step={0.01} min={0} max={scale} value={target} onChange={e => setTarget(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="next-credits" className="text-xs">Next semester credits</Label>
              <Input id="next-credits" type="number" min={1} max={60} value={nextCredits} onChange={e => setNextCredits(e.target.value)} />
            </div>
          </div>
          <p className="text-sm" aria-live="polite">
            {!grades.length
              ? 'Add at least one semester first.'
              : needed === null
                ? <span className="text-destructive">That target isn’t reachable next semester — try a lower target or more credits.</span>
                : needed <= 0
                  ? <span className="text-emerald-600 dark:text-emerald-400">You’re already there — keep it up!</span>
                  : <>You need an SGPA of <strong className="text-primary text-base">{needed.toFixed(2)}</strong> next semester.</>}
          </p>
        </div>
      </div>

      {semesters.length > 1 && (
        <div className="rounded-2xl border bg-card p-5">
          <p className="mb-3 text-sm font-semibold">SGPA by semester</p>
          <div className="flex h-32 items-end gap-3">
            {semesters.map(s => (
              <div key={s.semester} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold tabular-nums">{s.gpa.toFixed(2)}</span>
                <div className="w-full max-w-[48px] rounded-t-md bg-gradient-to-t from-primary/60 to-primary transition-all duration-700" style={{ height: `${(s.gpa / scale) * 100}%` }} />
                <span className="text-[11px] text-muted-foreground">S{s.semester}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {semesterNumbers.map(n => {
          const sem = semesters.find(s => s.semester === n);
          const rows = grades.filter(g => g.semester === n);
          return (
            <div key={n} className="rounded-xl border bg-card p-4 animate-fade-up">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">Semester {n}</p>
                <p className="text-sm text-muted-foreground">
                  SGPA <span className="font-semibold text-foreground">{sem ? sem.gpa.toFixed(2) : '—'}</span>
                  {sem && <> · {sem.credits} cr</>}
                </p>
              </div>
              <ul className="mt-3 divide-y text-sm">
                {rows.map(row => (
                  <li key={row.id} className="flex items-center gap-2 py-1.5">
                    <span className="flex-1 truncate">{row.courseName}</span>
                    <span className="w-10 text-right tabular-nums text-muted-foreground">{row.credits}</span>
                    <span className="w-10 text-right font-medium">{row.letter ?? row.gradePoint}</span>
                    <button type="button" onClick={() => remove.mutate(row.id)} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label={`Remove ${row.courseName}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <AddRow semester={n} scale={scale} onAdd={add(n)} />
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setExtraSemesters(list => [...list, Math.max(0, ...semesterNumbers) + 1])}
          disabled={semesterNumbers.length >= 16}
          className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Calculator className="h-6 w-6" />
          <span className="text-sm font-medium">{semesterNumbers.length ? 'Add semester' : 'Add your first semester'}</span>
        </button>
      </div>
    </div>
  );
};

export default GradesTab;
