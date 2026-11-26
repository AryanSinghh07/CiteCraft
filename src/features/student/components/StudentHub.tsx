import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowRight, CalendarDays, ClipboardList, Clock, GraduationCap, MapPin, Timer, UserCheck } from 'lucide-react';
import { useClassSessions, useCourses, useGrades, useTasks } from '../hooks';
import { COURSE_COLORS, attendanceStatus, cgpa, formatTime, relativeDue, taskGroup, todaysClasses } from '../utils';
import FocusTimer from './FocusTimer';

const HubCard = ({
  title,
  icon: Icon,
  to,
  children,
  className,
  delay = 0,
}: {
  title: string;
  icon: typeof Clock;
  to: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <Card className={cn('flex flex-col animate-fade-up', className)} style={{ animationDelay: `${delay}ms` }}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </CardTitle>
      <Link to={to} className="group flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary">
        Open <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </CardHeader>
    <CardContent className="flex-1">{children}</CardContent>
  </Card>
);

/** The student's daily overview: today's classes, deadlines, attendance, CGPA and a focus timer. */
const StudentHub = () => {
  const { items: courses, isLoading: loadingCourses } = useCourses();
  const { items: sessions, isLoading: loadingSessions } = useClassSessions();
  const { items: tasks } = useTasks();
  const { items: grades } = useGrades();

  const courseById = useMemo(() => Object.fromEntries(courses.map(c => [c.id, c])), [courses]);
  const { today, ongoing, next } = todaysClasses(sessions);
  const upcoming = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 4);
  const overdue = tasks.filter(t => taskGroup(t) === 'overdue').length;
  const atRisk = courses.filter(c => !attendanceStatus(c.attended, c.total, c.requiredPct).safe);
  const overall = cgpa(grades);

  if (loadingCourses || loadingSessions) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Today">
      <HubCard title="Today's classes" icon={CalendarDays} to="/college?tab=timetable">
        {today.length === 0 ? (
          <p className="text-sm text-muted-foreground">{sessions.length ? 'No classes today 🎉' : 'Add your timetable to see today’s classes.'}</p>
        ) : (
          <ul className="space-y-2">
            {today.slice(0, 4).map(s => {
              const course = courseById[s.courseId];
              const isNow = ongoing?.id === s.id;
              return (
                <li key={s.id} className={cn('flex items-start gap-2 rounded-lg p-1.5 text-sm', isNow && 'bg-primary/5')}>
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', COURSE_COLORS[course?.color ?? 'slate'].dot)} />
                  <div className="min-w-0">
                    <p className="font-medium leading-tight truncate">
                      {course?.name ?? 'Class'}
                      {isNow && <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">NOW</span>}
                      {!isNow && next?.id === s.id && <span className="ml-1.5 text-[10px] font-semibold text-primary">NEXT</span>}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {formatTime(s.start)}
                      {s.room && (
                        <>
                          <MapPin className="ml-1 h-3 w-3" /> {s.room}
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </HubCard>

      <HubCard title="Upcoming deadlines" icon={ClipboardList} to="/college?tab=tasks" delay={60}>
        {overdue > 0 && (
          <p className="mb-2 flex items-center gap-1 text-xs font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" /> {overdue} overdue
          </p>
        )}
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing due. Add assignments and exams to stay ahead.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(t => (
              <li key={t.id} className="text-sm">
                <p className="font-medium leading-tight truncate">{t.title}</p>
                <p className={cn('text-xs', taskGroup(t) === 'overdue' ? 'text-destructive' : 'text-muted-foreground')}>
                  {t.courseId && courseById[t.courseId] ? `${courseById[t.courseId].name} · ` : ''}due {relativeDue(t.dueAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </HubCard>

      <HubCard title="Attendance & grades" icon={UserCheck} to="/college?tab=attendance" delay={120}>
        <div className="space-y-3">
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add courses to track attendance.</p>
          ) : atRisk.length === 0 ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">All {courses.length} courses above the minimum ✓</p>
          ) : (
            <ul className="space-y-1.5">
              {atRisk.slice(0, 3).map(c => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 font-semibold text-destructive">
                    {Math.round(attendanceStatus(c.attended, c.total, c.requiredPct).pct)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/college?tab=grades" className="flex items-center gap-3 rounded-lg bg-muted/60 p-3 hover:bg-muted">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">CGPA</p>
              <p className="text-lg font-bold leading-tight">{grades.length ? overall.gpa.toFixed(2) : '—'}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </HubCard>

      <HubCard title="Focus" icon={Timer} to="/college?tab=focus" delay={180}>
        <FocusTimer compact />
      </HubCard>
    </section>
  );
};

export default StudentHub;
