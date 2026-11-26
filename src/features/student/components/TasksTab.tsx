import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { StudentTask, StudentTaskInput, TaskKind } from '@/types';
import { ClipboardList, Flag, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCourses, useTasks } from '../hooks';
import { COURSE_COLORS, TASK_GROUPS, TASK_KINDS, relativeDue, taskGroup, type TaskGroup } from '../utils';

const PRIORITY_STYLE = {
  high: 'text-red-600 dark:text-red-400',
  medium: 'text-amber-600 dark:text-amber-400',
  low: 'text-muted-foreground',
};
const NO_COURSE = '__none';
const GROUP_ORDER: TaskGroup[] = ['overdue', 'today', 'week', 'later', 'done'];

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInputs = (iso: string) => {
  const d = new Date(iso);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};

const blank = () => {
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  tomorrow.setHours(23, 59, 0, 0);
  return {
    title: '',
    kind: 'assignment' as TaskKind,
    courseId: '',
    priority: 'medium' as StudentTask['priority'],
    notes: '',
    ...toLocalInputs(tomorrow.toISOString()),
  };
};

/** Assignments, exams and other deadlines. */
const TasksTab = () => {
  const { items: courses } = useCourses();
  const { items: tasks, isLoading, create, update, remove } = useTasks();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentTask | null>(null);
  const [form, setForm] = useState(blank());
  const [kindFilter, setKindFilter] = useState<'all' | TaskKind>('all');

  const courseById = useMemo(() => Object.fromEntries(courses.map(c => [c.id, c])), [courses]);
  const grouped = useMemo(() => {
    const visible = tasks.filter(t => kindFilter === 'all' || t.kind === kindFilter);
    const groups: Record<TaskGroup, StudentTask[]> = { overdue: [], today: [], week: [], later: [], done: [] };
    for (const t of visible) groups[taskGroup(t)].push(t);
    groups.done.sort((a, b) => b.dueAt.localeCompare(a.dueAt));
    return groups;
  }, [tasks, kindFilter]);
  const pending = tasks.filter(t => t.status !== 'done').length;

  const openNew = () => {
    setEditing(null);
    setForm(blank());
    setOpen(true);
  };
  const openEdit = (task: StudentTask) => {
    setEditing(task);
    setForm({ title: task.title, kind: task.kind, courseId: task.courseId ?? '', priority: task.priority, notes: task.notes ?? '', ...toLocalInputs(task.dueAt) });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const due = new Date(`${form.date}T${form.time || '23:59'}`);
    if (Number.isNaN(due.getTime())) {
      toast({ title: 'Choose a valid due date', variant: 'destructive' });
      return;
    }
    const input: StudentTaskInput = {
      title: form.title.trim(),
      kind: form.kind,
      courseId: form.courseId || null,
      priority: form.priority,
      notes: form.notes,
      dueAt: due.toISOString(),
      status: editing?.status ?? 'todo',
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, patch: input });
      else await create.mutateAsync(input);
      setOpen(false);
      toast({ title: editing ? 'Updated' : `${TASK_KINDS[input.kind]} added`, description: input.title });
    } catch (error) {
      toast({ title: 'Could not save', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    }
  };

  const toggleDone = (task: StudentTask) =>
    update.mutate({ id: task.id, patch: { status: task.status === 'done' ? 'todo' : 'done' } });

  if (isLoading) return <Skeleton className="h-80 rounded-xl" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={kindFilter} onValueChange={v => setKindFilter(v as 'all' | TaskKind)}>
            <SelectTrigger className="w-[170px]" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(TASK_KINDS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{pending} pending</span>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Add deadline
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="max-w-sm text-muted-foreground">Track assignments, exams, quizzes and project deadlines in one place.</p>
        </div>
      ) : (
        GROUP_ORDER.filter(g => grouped[g].length).map(group => (
          <section key={group} className="space-y-2">
            <h3
              className={cn(
                'text-sm font-semibold',
                group === 'overdue' && 'text-destructive',
                group === 'today' && 'text-primary',
                group === 'done' && 'text-muted-foreground',
              )}
            >
              {TASK_GROUPS[group]} <span className="font-normal text-muted-foreground">({grouped[group].length})</span>
            </h3>
            <ul className="space-y-2">
              {grouped[group].map(task => {
                const course = task.courseId ? courseById[task.courseId] : undefined;
                return (
                  <li
                    key={task.id}
                    className={cn(
                      'group flex items-start gap-3 rounded-xl border bg-card p-3 transition-colors animate-fade-up',
                      task.status === 'done' && 'opacity-60',
                      group === 'overdue' && 'border-destructive/30',
                    )}
                  >
                    <Checkbox
                      checked={task.status === 'done'}
                      onCheckedChange={() => toggleDone(task)}
                      className="mt-1"
                      aria-label={task.status === 'done' ? 'Mark as not done' : 'Mark as done'}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn('font-medium leading-snug', task.status === 'done' && 'line-through')}>{task.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{TASK_KINDS[task.kind]}</span>
                        {course && (
                          <span className="flex items-center gap-1">
                            <span className={cn('h-2 w-2 rounded-full', COURSE_COLORS[course.color].dot)} />
                            {course.name}
                          </span>
                        )}
                        <span title={new Date(task.dueAt).toLocaleString()}>
                          {new Date(task.dueAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })},{' '}
                          {new Date(task.dueAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {task.status !== 'done' && (
                          <span className={cn('font-medium', group === 'overdue' ? 'text-destructive' : 'text-foreground')}>
                            {relativeDue(task.dueAt)}
                          </span>
                        )}
                        <span className={cn('flex items-center gap-0.5', PRIORITY_STYLE[task.priority])}>
                          <Flag className="h-3 w-3" /> {task.priority}
                        </span>
                      </div>
                      {task.notes && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.notes}</p>}
                    </div>
                    <div className="flex shrink-0 opacity-60 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(task)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => remove.mutate(task.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit deadline' : 'Add a deadline'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-title">What is it? *</Label>
              <Input
                id="task-title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. DBMS assignment 3"
                maxLength={200}
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.kind} onValueChange={v => setForm(f => ({ ...f, kind: v as TaskKind }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_KINDS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Course</Label>
                <Select value={form.courseId || NO_COURSE} onValueChange={v => setForm(f => ({ ...f, courseId: v === NO_COURSE ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_COURSE}>No course</SelectItem>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-date">Due date</Label>
                <Input id="task-date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-time">Time</Label>
                <Input id="task-time" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                {(['low', 'medium', 'high'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, priority: p }))}
                    className={cn(
                      'rounded-md py-1.5 text-sm capitalize transition-colors',
                      form.priority === p ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground',
                    )}
                    aria-pressed={form.priority === p}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-notes">Notes</Label>
              <Textarea id="task-notes" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} maxLength={4000} placeholder="Chapters, submission link…" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending || !form.title.trim()}>
                {(create.isPending || update.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksTab;
