import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Course } from '@/types';
import { Check, Pencil, Plus, Trash2, Undo2, UserCheck, X } from 'lucide-react';
import { useCourses } from '../hooks';
import { COURSE_COLORS, attendanceMessage, attendanceStatus } from '../utils';
import CourseDialog from './CourseDialog';

const Ring = ({ pct, safe }: { pct: number; safe: boolean }) => {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={safe ? 'hsl(var(--chart-3))' : 'hsl(var(--destructive))'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, pct) / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{Math.round(pct)}%</span>
    </div>
  );
};

/** Per-course attendance with the minimum-attendance rule worked out for you. */
const AttendanceTab = () => {
  const { items: courses, isLoading, update, remove } = useCourses();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<{ open: boolean; course: Course | null }>({ open: false, course: null });
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null);
  // last change per course, so a mis-tap can be undone
  const [lastMark, setLastMark] = useState<Record<string, 'present' | 'absent'>>({});

  const mark = (course: Course, kind: 'present' | 'absent') => {
    update.mutate({
      id: course.id,
      patch: { attended: course.attended + (kind === 'present' ? 1 : 0), total: course.total + 1 },
    });
    setLastMark(m => ({ ...m, [course.id]: kind }));
  };
  const undo = (course: Course) => {
    const last = lastMark[course.id];
    if (!last || course.total === 0) return;
    update.mutate({
      id: course.id,
      patch: { attended: Math.max(0, course.attended - (last === 'present' ? 1 : 0)), total: course.total - 1 },
    });
    setLastMark(m => {
      const next = { ...m };
      delete next[course.id];
      return next;
    });
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  const overall = courses.reduce((acc, c) => ({ attended: acc.attended + c.attended, total: acc.total + c.total }), { attended: 0, total: 0 });
  const atRisk = courses.filter(c => !attendanceStatus(c.attended, c.total, c.requiredPct).safe);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {courses.length
            ? `Overall ${overall.total ? Math.round((overall.attended / overall.total) * 100) : 100}% · ${atRisk.length ? `${atRisk.length} course${atRisk.length > 1 ? 's' : ''} below the minimum` : 'all courses on track'}`
            : 'Mark each class as present or absent — we’ll tell you how many you can miss.'}
        </p>
        <Button onClick={() => setDialog({ open: true, course: null })}>
          <Plus className="mr-2 h-4 w-4" /> Add course
        </Button>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <UserCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="max-w-sm text-muted-foreground">Add your courses to start tracking attendance.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course, i) => {
            const status = attendanceStatus(course.attended, course.total, course.requiredPct);
            const color = COURSE_COLORS[course.color];
            return (
              <div
                key={course.id}
                className={cn('rounded-xl border bg-card p-4 shadow-sm animate-fade-up', !status.safe && 'border-destructive/40')}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <Ring pct={status.pct} safe={status.safe} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-medium">
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', color.dot)} />
                      <span className="truncate">{course.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {course.attended} / {course.total} attended · min {course.requiredPct}%
                    </p>
                    <p className={cn('mt-1 text-xs font-medium', status.safe ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                      {attendanceMessage(course)}
                    </p>
                  </div>
                  <div className="flex">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ open: true, course })} aria-label={`Edit ${course.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setPendingDelete(course)} aria-label={`Delete ${course.name}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300" onClick={() => mark(course, 'present')}>
                    <Check className="mr-1 h-4 w-4" /> Present
                  </Button>
                  <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => mark(course, 'absent')}>
                    <X className="mr-1 h-4 w-4" /> Absent
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => undo(course)} disabled={!lastMark[course.id]} aria-label="Undo last mark">
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CourseDialog open={dialog.open} course={dialog.course} onOpenChange={open => setDialog(d => ({ ...d, open }))} />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={open => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its timetable classes and attendance will be removed. Deadlines linked to it are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await remove.mutateAsync(pendingDelete.id);
                  toast({ title: 'Course deleted' });
                } catch (error) {
                  toast({ title: 'Could not delete', description: error instanceof Error ? error.message : '', variant: 'destructive' });
                }
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AttendanceTab;
