import { requireSupabase } from '@/lib/supabase';
import type { ClassSession, Course, GradeEntry, StudentTask } from '@/types';
import type { CollectionService, StudentService } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const blankToNull = (v: unknown) => (typeof v === 'string' ? v.trim() || null : (v ?? null));
const opt = <T,>(v: T | null): T | undefined => (v === null ? undefined : v);
const hhmm = (time: string) => String(time).slice(0, 5);

/** Copies only the fields present in an input/patch, renaming them to column names. */
function pick(input: Row, map: Record<string, string>, transform: Record<string, (v: any) => any> = {}): Row {
  const row: Row = {};
  for (const [field, column] of Object.entries(map)) {
    if (input[field] !== undefined) row[column] = (transform[field] ?? (v => v))(input[field]);
  }
  return row;
}

/** Generic owner-scoped CRUD on a table; Row Level Security does the real access control. */
function collection<T extends { id: string }, I>(
  table: string,
  fromRow: (row: Row) => T,
  toRow: (input: Row) => Row,
  order: { column: string; ascending: boolean }[],
): CollectionService<T, I> {
  return {
    async list(userId) {
      let query = requireSupabase().from(table).select('*').eq('user_id', userId);
      for (const o of order) query = query.order(o.column, { ascending: o.ascending });
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []).map(fromRow);
    },
    async create(userId, input) {
      const { data, error } = await requireSupabase()
        .from(table)
        .insert({ ...toRow(input as Row), user_id: userId })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return fromRow(data);
    },
    async update(userId, id, patch) {
      const { data, error } = await requireSupabase()
        .from(table)
        .update(toRow(patch as Row))
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return fromRow(data);
    },
    async remove(userId, id) {
      const { error } = await requireSupabase().from(table).delete().eq('id', id).eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
  };
}

export const supabaseStudent: StudentService = {
  courses: collection<Course, any>(
    'courses',
    r => ({
      id: r.id,
      name: r.name,
      code: opt(r.code),
      teacher: opt(r.teacher),
      credits: Number(r.credits),
      color: r.color,
      attended: r.attended,
      total: r.total,
      requiredPct: r.required_pct,
      createdAt: r.created_at,
    }),
    i =>
      pick(
        i,
        {
          name: 'name',
          code: 'code',
          teacher: 'teacher',
          credits: 'credits',
          color: 'color',
          attended: 'attended',
          total: 'total',
          requiredPct: 'required_pct',
        },
        { code: blankToNull, teacher: blankToNull },
      ),
    [{ column: 'name', ascending: true }],
  ),
  sessions: collection<ClassSession, any>(
    'class_sessions',
    r => ({
      id: r.id,
      courseId: r.course_id,
      day: r.day,
      start: hhmm(r.start_time),
      end: hhmm(r.end_time),
      room: opt(r.room),
      kind: r.kind,
    }),
    i => pick(i, { courseId: 'course_id', day: 'day', start: 'start_time', end: 'end_time', room: 'room', kind: 'kind' }, { room: blankToNull }),
    [
      { column: 'day', ascending: true },
      { column: 'start_time', ascending: true },
    ],
  ),
  tasks: collection<StudentTask, any>(
    'student_tasks',
    r => ({
      id: r.id,
      courseId: r.course_id,
      title: r.title,
      kind: r.kind,
      dueAt: r.due_at,
      priority: r.priority,
      status: r.status,
      notes: opt(r.notes),
      createdAt: r.created_at,
    }),
    i =>
      pick(
        i,
        { courseId: 'course_id', title: 'title', kind: 'kind', dueAt: 'due_at', priority: 'priority', status: 'status', notes: 'notes' },
        { notes: blankToNull, courseId: v => v || null },
      ),
    [{ column: 'due_at', ascending: true }],
  ),
  grades: collection<GradeEntry, any>(
    'grade_entries',
    r => ({
      id: r.id,
      semester: r.semester,
      courseName: r.course_name,
      credits: Number(r.credits),
      gradePoint: Number(r.grade_point),
      letter: opt(r.letter),
    }),
    i =>
      pick(
        i,
        { semester: 'semester', courseName: 'course_name', credits: 'credits', gradePoint: 'grade_point', letter: 'letter' },
        { letter: blankToNull },
      ),
    [
      { column: 'semester', ascending: true },
      { column: 'created_at', ascending: true },
    ],
  ),
};
