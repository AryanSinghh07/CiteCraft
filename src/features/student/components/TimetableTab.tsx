import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ClassKind, ClassSession, ClassSessionInput } from '@/types';
import { AlertTriangle, CalendarDays, Clock, Loader2, MapPin, Plus, Trash2 } from 'lucide-react';
import { useClassSessions, useCourses } from '../hooks';
import { COURSE_COLORS, DAYS, SHORT_DAYS, formatTime, isoDay, sessionsOverlap, todaysClasses } from '../utils';
import CourseDialog from './CourseDialog';

const KINDS: Record<ClassKind, string> = { lecture: 'Lecture', lab: 'Lab', tutorial: 'Tutorial', other: 'Other' };
const NEW_COURSE = '__new';

const blank = (courseId = ''): ClassSessionInput => ({ courseId, day: isoDay(), start: '09:00', end: '10:00', room: '', kind: 'lecture' });

/** Weekly class timetable. */
const TimetableTab = () => {
  const { items: courses } = useCourses();
  const { items: sessions, isLoading, create, update, remove } = useClassSessions();
  const { toast } = useToast();
  const [editing, setEditing] = useState<ClassSession | null>(null);
  const [open, setOpen] = useState(false);
  const [courseDialog, setCourseDialog] = useState(false);
  const [form, setForm] = useState<ClassSessionInput>(blank());

  const courseById = useMemo(() => Object.fromEntries(courses.map(c => [c.id, c])), [courses]);
  const today = isoDay();
  const { ongoing } = todaysClasses(sessions);
  const days = [1, 2, 3, 4, 5, 6, ...(sessions.some(s => s.day === 7) ? [7] : [])];

  const clash = sessions.find(s => s.id !== editing?.id && sessionsOverlap(s, form));
  const busy = create.isPending || update.isPending;

  const openNew = (day?: number) => {
    setEditing(null);
    setForm({ ...blank(courses[0]?.id), ...(day ? { day } : {}) });
    setOpen(true);
  };
  const openEdit = (session: ClassSession) => {
    setEditing(session);
    setForm({ ...session, room: session.room ?? '' });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId) return;
    if (form.end <= form.start) {
      toast({ title: 'Check the times', description: 'The class must end after it starts.', variant: 'destructive' });
      return;
    }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, patch: form });
      else await create.mutateAsync(form);
      setOpen(false);
      toast({ title: editing ? 'Class updated' : 'Class added' });
    } catch (error) {
      toast({ title: 'Could not save class', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    }
  };

  const deleteClass = async () => {
    if (!editing) return;
    try {
      await remove.mutateAsync(editing.id);
      setOpen(false);
      toast({ title: 'Class removed' });
    } catch (error) {
      toast({ title: 'Could not remove', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    }
  };

  if (isLoading) return <Skeleton className="h-80 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sessions.length
            ? `${sessions.length} classes a week across ${new Set(sessions.map(s => s.courseId)).size} courses`
            : 'Add your weekly classes to see today’s schedule on your dashboard.'}
        </p>
        <Button onClick={() => (courses.length ? openNew() : setCourseDialog(true))}>
          <Plus className="mr-2 h-4 w-4" /> {courses.length ? 'Add class' : 'Add your first course'}
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="max-w-sm text-muted-foreground">
            {courses.length
              ? 'No classes yet. Click “Add class” to build your week.'
              : 'Start by adding your courses (subjects), then add when each class happens.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 [&>*]:min-w-0">
          {days.map(day => {
            const list = sessions.filter(s => s.day === day);
            return (
              <div
                key={day}
                className={cn(
                  'rounded-xl border bg-card p-3 space-y-2 animate-fade-up',
                  day === today && 'border-primary/50 ring-1 ring-primary/20',
                )}
                style={{ animationDelay: `${day * 40}ms` }}
              >
                <div className="flex items-center justify-between">
                  <p className={cn('text-sm font-semibold', day === today && 'text-primary')}>
                    <span className="xl:hidden">{DAYS[day - 1]}</span>
                    <span className="hidden xl:inline">{SHORT_DAYS[day - 1]}</span>
                    {day === today && <span className="ml-1.5 text-xs font-normal">· Today</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => openNew(day)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary"
                    aria-label={`Add class on ${DAYS[day - 1]}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {list.length === 0 && <p className="text-xs text-muted-foreground py-2">Free day</p>}
                {list.map(session => {
                  const course = courseById[session.courseId];
                  const color = COURSE_COLORS[course?.color ?? 'slate'];
                  const isNow = ongoing?.id === session.id;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => openEdit(session)}
                      className={cn(
                        'relative w-full rounded-lg border p-2.5 text-left transition-transform hover:-translate-y-0.5',
                        color.soft,
                      )}
                    >
                      {isNow && (
                        <span className="absolute right-2 top-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> NOW
                        </span>
                      )}
                      <p className={cn('text-sm font-medium leading-tight pr-8', color.text)}>{course?.name ?? 'Unknown course'}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {formatTime(session.start)} – {formatTime(session.end)}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        {session.room && (
                          <>
                            <MapPin className="h-3 w-3" /> {session.room} ·{' '}
                          </>
                        )}
                        {KINDS[session.kind]}
                      </p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit class' : 'Add a class'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Course</Label>
              <Select
                value={form.courseId}
                onValueChange={v => (v === NEW_COURSE ? setCourseDialog(true) : setForm(f => ({ ...f, courseId: v })))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_COURSE}>+ New course…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Day</Label>
                <Select value={String(form.day)} onValueChange={v => setForm(f => ({ ...f, day: Number(v) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => (
                      <SelectItem key={d} value={String(i + 1)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.kind} onValueChange={v => setForm(f => ({ ...f, kind: v as ClassKind }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(KINDS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cls-start">Starts</Label>
                <Input id="cls-start" type="time" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cls-end">Ends</Label>
                <Input id="cls-end" type="time" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cls-room">Room</Label>
              <Input id="cls-room" value={form.room ?? ''} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="e.g. LH-204" maxLength={60} />
            </div>
            {clash && (
              <p className="flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Overlaps with {courseById[clash.courseId]?.name ?? 'another class'} ({formatTime(clash.start)} – {formatTime(clash.end)}).
              </p>
            )}
            <DialogFooter className="gap-2 sm:justify-between">
              {editing ? (
                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={deleteClass} disabled={remove.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={busy || !form.courseId}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save' : 'Add class'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CourseDialog
        open={courseDialog}
        onOpenChange={setCourseDialog}
        onSaved={course => {
          setForm(f => ({ ...f, courseId: course.id }));
          if (!open) {
            setEditing(null);
            setForm({ ...blank(course.id) });
            setOpen(true);
          }
        }}
      />
    </div>
  );
};

export default TimetableTab;
