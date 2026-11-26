import type { ClassSession, Course, CourseColor, GradeEntry, StudentTask, TaskKind } from '@/types';

// ------------------------------------------------------------------ colours

export const COURSE_COLORS: Record<CourseColor, { dot: string; soft: string; text: string }> = {
  blue: { dot: 'bg-blue-500', soft: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-700 dark:text-blue-300' },
  violet: { dot: 'bg-violet-500', soft: 'bg-violet-500/10 border-violet-500/30', text: 'text-violet-700 dark:text-violet-300' },
  emerald: { dot: 'bg-emerald-500', soft: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300' },
  amber: { dot: 'bg-amber-500', soft: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-700 dark:text-amber-300' },
  rose: { dot: 'bg-rose-500', soft: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-700 dark:text-rose-300' },
  cyan: { dot: 'bg-cyan-500', soft: 'bg-cyan-500/10 border-cyan-500/30', text: 'text-cyan-700 dark:text-cyan-300' },
  orange: { dot: 'bg-orange-500', soft: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-700 dark:text-orange-300' },
  slate: { dot: 'bg-slate-500', soft: 'bg-slate-500/10 border-slate-500/30', text: 'text-slate-700 dark:text-slate-300' },
};
export const COLOR_ORDER = Object.keys(COURSE_COLORS) as CourseColor[];

// ------------------------------------------------------------------ attendance

export interface AttendanceStatus {
  pct: number;
  /** consecutive classes you can miss and stay at or above the requirement */
  canSkip: number;
  /** consecutive classes you must attend to reach the requirement */
  mustAttend: number;
  safe: boolean;
}

export function attendanceStatus(attended: number, total: number, requiredPct: number): AttendanceStatus {
  const r = requiredPct / 100;
  const pct = total === 0 ? 100 : (attended / total) * 100;
  if (total === 0) return { pct, canSkip: 0, mustAttend: 0, safe: true };
  if (attended / total >= r) {
    // attended / (total + x) >= r  →  x <= attended / r - total
    const canSkip = r === 0 ? Infinity : Math.floor(attended / r - total + 1e-9);
    return { pct, canSkip: Math.max(0, canSkip), mustAttend: 0, safe: true };
  }
  // (attended + x) / (total + x) >= r  →  x >= (r·total − attended) / (1 − r)
  const mustAttend = r >= 1 ? Infinity : Math.ceil((r * total - attended) / (1 - r) - 1e-9);
  return { pct, canSkip: 0, mustAttend: Math.max(0, mustAttend), safe: false };
}

export function attendanceMessage(course: Pick<Course, 'attended' | 'total' | 'requiredPct'>): string {
  const s = attendanceStatus(course.attended, course.total, course.requiredPct);
  if (course.total === 0) return 'No classes marked yet';
  if (s.safe) {
    if (!Number.isFinite(s.canSkip)) return 'No minimum attendance';
    return s.canSkip === 0 ? "On the edge — don't miss the next class" : `You can miss ${s.canSkip} class${s.canSkip > 1 ? 'es' : ''}`;
  }
  return Number.isFinite(s.mustAttend)
    ? `Attend the next ${s.mustAttend} class${s.mustAttend > 1 ? 'es' : ''} to reach ${course.requiredPct}%`
    : `You need to attend every class`;
}

// ------------------------------------------------------------------ grades

export interface GradeOption {
  letter: string;
  point: number;
}

export const GRADE_SCALES: Record<4 | 10, GradeOption[]> = {
  10: [
    { letter: 'O', point: 10 },
    { letter: 'A+', point: 9 },
    { letter: 'A', point: 8 },
    { letter: 'B+', point: 7 },
    { letter: 'B', point: 6 },
    { letter: 'C', point: 5 },
    { letter: 'P', point: 4 },
    { letter: 'F', point: 0 },
  ],
  4: [
    { letter: 'A', point: 4 },
    { letter: 'A-', point: 3.7 },
    { letter: 'B+', point: 3.3 },
    { letter: 'B', point: 3 },
    { letter: 'B-', point: 2.7 },
    { letter: 'C+', point: 2.3 },
    { letter: 'C', point: 2 },
    { letter: 'D', point: 1 },
    { letter: 'F', point: 0 },
  ],
};

const weighted = (entries: Pick<GradeEntry, 'credits' | 'gradePoint'>[]) => {
  const credits = entries.reduce((s, e) => s + e.credits, 0);
  const points = entries.reduce((s, e) => s + e.credits * e.gradePoint, 0);
  return { credits, points, gpa: credits ? points / credits : 0 };
};

/** SGPA for each semester, in order. */
export function semesterGpas(entries: GradeEntry[]) {
  const semesters = [...new Set(entries.map(e => e.semester))].sort((a, b) => a - b);
  return semesters.map(semester => {
    const list = entries.filter(e => e.semester === semester);
    return { semester, ...weighted(list), courses: list.length };
  });
}

/** Overall CGPA (credit-weighted over every course). */
export const cgpa = (entries: GradeEntry[]) => weighted(entries);

/**
 * SGPA needed next semester to reach a target CGPA.
 * Returns null when it is impossible on this scale.
 */
export function requiredSgpa(entries: GradeEntry[], target: number, nextCredits: number, scale: 4 | 10): number | null {
  const { credits, points } = weighted(entries);
  if (nextCredits <= 0) return null;
  const needed = (target * (credits + nextCredits) - points) / nextCredits;
  if (needed > scale) return null;
  return Math.max(0, needed);
}

/** Common Indian conversion (CGPA × 9.5); for 10-point scales only. */
export const cgpaToPercentage = (value: number) => value * 9.5;

// ------------------------------------------------------------------ timetable

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** 1 = Monday … 7 = Sunday */
export const isoDay = (date = new Date()) => ((date.getDay() + 6) % 7) + 1;
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Today's classes, and which one is happening now / next. */
export function todaysClasses(sessions: ClassSession[], now = new Date()) {
  const day = isoDay(now);
  const current = now.getHours() * 60 + now.getMinutes();
  const today = sessions.filter(s => s.day === day).sort((a, b) => minutes(a.start) - minutes(b.start));
  const ongoing = today.find(s => minutes(s.start) <= current && current < minutes(s.end)) ?? null;
  const next = today.find(s => minutes(s.start) > current) ?? null;
  return { today, ongoing, next, done: today.filter(s => minutes(s.end) <= current) };
}

export function sessionsOverlap(a: Pick<ClassSession, 'day' | 'start' | 'end'>, b: Pick<ClassSession, 'day' | 'start' | 'end'>) {
  return a.day === b.day && minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);
}

// ------------------------------------------------------------------ tasks

export const TASK_KINDS: Record<TaskKind, string> = {
  assignment: 'Assignment',
  exam: 'Exam',
  quiz: 'Quiz',
  project: 'Project',
  lab: 'Lab',
  presentation: 'Presentation',
  other: 'Other',
};

export type TaskGroup = 'overdue' | 'today' | 'week' | 'later' | 'done';
export const TASK_GROUPS: Record<TaskGroup, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  week: 'Next 7 days',
  later: 'Later',
  done: 'Done',
};

export function taskGroup(task: Pick<StudentTask, 'dueAt' | 'status'>, now = new Date()): TaskGroup {
  if (task.status === 'done') return 'done';
  const due = new Date(task.dueAt);
  if (due < now) return 'overdue';
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  if (due <= endOfToday) return 'today';
  if (due.getTime() - now.getTime() <= 7 * 24 * 3600 * 1000) return 'week';
  return 'later';
}

/** "in 3 days", "2 hours ago"… */
export function relativeDue(iso: string, now = new Date()) {
  const diff = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(diff);
  const fmt = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  const text =
    abs < 3600_000
      ? fmt(Math.max(1, Math.round(abs / 60_000)), 'minute')
      : abs < 48 * 3600_000
        ? fmt(Math.round(abs / 3600_000), 'hour')
        : fmt(Math.round(abs / (24 * 3600_000)), 'day');
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}
