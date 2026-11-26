import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Course, CourseColor, CourseInput } from '@/types';
import { Loader2 } from 'lucide-react';
import { useCourses } from '../hooks';
import { COLOR_ORDER, COURSE_COLORS } from '../utils';

interface CourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** edit this course; omit to create a new one */
  course?: Course | null;
  onSaved?: (course: Course) => void;
}

const emptyForm = (index: number): CourseInput => ({
  name: '',
  code: '',
  teacher: '',
  credits: 3,
  color: COLOR_ORDER[index % COLOR_ORDER.length],
  attended: 0,
  total: 0,
  requiredPct: 75,
});

/** Add or edit a course (subject). */
const CourseDialog = ({ open, onOpenChange, course, onSaved }: CourseDialogProps) => {
  const { items, create, update } = useCourses();
  const { toast } = useToast();
  const [form, setForm] = useState<CourseInput>(emptyForm(items.length));

  useEffect(() => {
    if (open) setForm(course ? { ...course } : emptyForm(items.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, course]);

  const busy = create.isPending || update.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const input: CourseInput = {
        ...form,
        name: form.name.trim(),
        credits: Math.max(0, Number(form.credits) || 0),
        requiredPct: Math.min(100, Math.max(0, Number(form.requiredPct) || 0)),
      };
      const saved = course ? await update.mutateAsync({ id: course.id, patch: input }).then(() => ({ ...course, ...input })) : await create.mutateAsync(input);
      toast({ title: course ? 'Course updated' : 'Course added', description: input.name });
      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Could not save course', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{course ? 'Edit course' : 'Add a course'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="course-name">Course name *</Label>
            <Input
              id="course-name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Data Structures"
              maxLength={120}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="course-code">Code</Label>
              <Input id="course-code" value={form.code ?? ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="CS201" maxLength={30} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-credits">Credits</Label>
              <Input
                id="course-credits"
                type="number"
                min={0}
                max={40}
                step={0.5}
                value={form.credits}
                onChange={e => setForm(f => ({ ...f, credits: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="course-teacher">Teacher</Label>
              <Input id="course-teacher" value={form.teacher ?? ''} onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-req">Min. attendance %</Label>
              <Input
                id="course-req"
                type="number"
                min={0}
                max={100}
                value={form.requiredPct}
                onChange={e => setForm(f => ({ ...f, requiredPct: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Course colour">
              {COLOR_ORDER.map(color => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={form.color === color}
                  aria-label={color}
                  onClick={() => setForm(f => ({ ...f, color: color as CourseColor }))}
                  className={cn(
                    'h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110',
                    COURSE_COLORS[color].dot,
                    form.color === color && 'ring-2 ring-foreground',
                  )}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !form.name.trim()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {course ? 'Save' : 'Add course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CourseDialog;
