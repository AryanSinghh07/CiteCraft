-- =====================================================================
-- CiteCraft v2 — daily college tools
--   courses         : subjects, with attendance counts and the minimum % required
--   class_sessions  : weekly timetable slots for a course
--   student_tasks   : assignments, exams, quizzes… with due dates
--   grade_entries   : course grades per semester, for SGPA / CGPA
--   profiles.grade_scale : 10-point (default) or 4-point grading
-- Everything is private to its owner. Safe to run more than once.
-- =====================================================================

alter table public.profiles add column if not exists grade_scale smallint not null default 10;
do $$
begin
  alter table public.profiles add constraint profiles_grade_scale_check check (grade_scale in (4, 10));
exception
  when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------------
create table if not exists public.courses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  code          text check (char_length(code) <= 30),
  teacher       text check (char_length(teacher) <= 120),
  credits       numeric(4, 1) not null default 3 check (credits >= 0 and credits <= 40),
  color         text not null default 'blue' check (color ~ '^[a-z]{3,10}$'),
  attended      integer not null default 0 check (attended >= 0),
  total         integer not null default 0 check (total >= 0),
  required_pct  smallint not null default 75 check (required_pct between 0 and 100),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint courses_attended_le_total check (attended <= total)
);

-- ---------------------------------------------------------------------
create table if not exists public.class_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  course_id   uuid not null references public.courses (id) on delete cascade,
  day         smallint not null check (day between 1 and 7), -- 1 = Monday … 7 = Sunday
  start_time  time not null,
  end_time    time not null,
  room        text check (char_length(room) <= 60),
  kind        text not null default 'lecture' check (kind in ('lecture', 'lab', 'tutorial', 'other')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint class_sessions_time_order check (end_time > start_time)
);

-- ---------------------------------------------------------------------
create table if not exists public.student_tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  course_id   uuid references public.courses (id) on delete set null,
  title       text not null check (char_length(title) between 1 and 200),
  kind        text not null default 'assignment'
                check (kind in ('assignment', 'exam', 'quiz', 'project', 'lab', 'presentation', 'other')),
  due_at      timestamptz not null,
  priority    text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status      text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  notes       text check (char_length(notes) <= 4000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
create table if not exists public.grade_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  semester     smallint not null check (semester between 1 and 16),
  course_name  text not null check (char_length(course_name) between 1 and 120),
  credits      numeric(4, 1) not null check (credits > 0 and credits <= 40),
  grade_point  numeric(4, 2) not null check (grade_point >= 0 and grade_point <= 10),
  letter       text check (char_length(letter) <= 4),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Shared setup: indexes, updated_at triggers and owner-only security.
do $$
declare
  t text;
begin
  foreach t in array array['courses', 'class_sessions', 'student_tasks', 'grade_entries'] loop
    execute format('create index if not exists %1$s_user_idx on public.%1$s (user_id)', t);

    execute format('drop trigger if exists %1$s_set_updated_at on public.%1$s', t);
    execute format(
      'create trigger %1$s_set_updated_at before update on public.%1$s for each row execute function public.set_updated_at()',
      t);

    execute format('alter table public.%s enable row level security', t);

    execute format('drop policy if exists "%1$s: read own" on public.%1$s', t);
    execute format('create policy "%1$s: read own" on public.%1$s for select using (auth.uid() = user_id)', t);

    execute format('drop policy if exists "%1$s: insert own" on public.%1$s', t);
    execute format('create policy "%1$s: insert own" on public.%1$s for insert with check (auth.uid() = user_id)', t);

    execute format('drop policy if exists "%1$s: update own" on public.%1$s', t);
    execute format(
      'create policy "%1$s: update own" on public.%1$s for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t);

    execute format('drop policy if exists "%1$s: delete own" on public.%1$s', t);
    execute format('create policy "%1$s: delete own" on public.%1$s for delete using (auth.uid() = user_id)', t);
  end loop;
end;
$$;

create index if not exists student_tasks_due_idx on public.student_tasks (user_id, status, due_at);

-- A timetable slot or task can only point at the owner's own course.
create or replace function public.check_course_owner()
returns trigger
language plpgsql
as $$
begin
  if new.course_id is not null
     and not exists (select 1 from public.courses c where c.id = new.course_id and c.user_id = new.user_id) then
    raise exception 'Course not found';
  end if;
  return new;
end;
$$;

drop trigger if exists class_sessions_check_course on public.class_sessions;
create trigger class_sessions_check_course
  before insert or update on public.class_sessions
  for each row execute function public.check_course_owner();

drop trigger if exists student_tasks_check_course on public.student_tasks;
create trigger student_tasks_check_course
  before insert or update on public.student_tasks
  for each row execute function public.check_course_owner();
