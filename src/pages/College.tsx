import { useSearchParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, ClipboardList, GraduationCap, School, Timer, UserCheck } from 'lucide-react';
import TimetableTab from '@/features/student/components/TimetableTab';
import TasksTab from '@/features/student/components/TasksTab';
import AttendanceTab from '@/features/student/components/AttendanceTab';
import GradesTab from '@/features/student/components/GradesTab';
import FocusTimer from '@/features/student/components/FocusTimer';
import SetupNotice from '@/components/common/SetupNotice';
import { useClassSessions, useCourses, useGrades, useTasks } from '@/features/student/hooks';

const TABS = [
  { value: 'timetable', label: 'Timetable', icon: CalendarDays },
  { value: 'tasks', label: 'Assignments & exams', icon: ClipboardList },
  { value: 'attendance', label: 'Attendance', icon: UserCheck },
  { value: 'grades', label: 'CGPA', icon: GraduationCap },
  { value: 'focus', label: 'Focus timer', icon: Timer },
] as const;
type Tab = (typeof TABS)[number]['value'];

/** Daily college tools in one place. The active tab is kept in the URL (?tab=…). */
const College = () => {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some(t => t.value === params.get('tab')) ? params.get('tab') : 'timetable') as Tab;
  // Load every tab's data at once, in parallel, so switching tabs is instant.
  const loads = [useCourses(), useClassSessions(), useTasks(), useGrades()];
  const setupError = loads.find(l => l.error)?.error;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-6 animate-fade-up">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <School className="h-7 w-7 text-primary" /> College
            </h1>
            <p className="text-muted-foreground">Your timetable, deadlines, attendance and grades — all in one place.</p>
          </header>

          {setupError && (
            <div className="mb-6">
              <SetupNotice error={setupError} feature="College tools" migration="0007_student_tools.sql" />
            </div>
          )}

          <Tabs value={tab} onValueChange={v => setParams({ tab: v }, { replace: true })}>
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-muted/70 p-1 sm:w-auto">
              {TABS.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="gap-2 rounded-lg px-3 py-2 data-[state=active]:shadow-sm">
                  <t.icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="timetable" className="pt-6">
              <TimetableTab />
            </TabsContent>
            <TabsContent value="tasks" className="pt-6">
              <TasksTab />
            </TabsContent>
            <TabsContent value="attendance" className="pt-6">
              <AttendanceTab />
            </TabsContent>
            <TabsContent value="grades" className="pt-6">
              <GradesTab />
            </TabsContent>
            <TabsContent value="focus" className="pt-6">
              <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 shadow-sm">
                <FocusTimer />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default College;
