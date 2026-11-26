-- =====================================================================
-- CiteCraft v2 — students
--   profiles      : account type (student / researcher) + study details
--   publications  : new work types (thesis, report, preprint, project, poster)
--                   and a generic "venue" (institution, repository, event…)
--   reading_list  : papers a user is reading, with status and notes
-- Safe to run more than once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists account_type text not null default 'researcher';
alter table public.profiles add column if not exists program text;
alter table public.profiles add column if not exists year_of_study text;
alter table public.profiles add column if not exists supervisor text;

do $$
begin
  alter table public.profiles
    add constraint profiles_account_type_check check (account_type in ('researcher', 'student'));
exception
  when duplicate_object then null;
end;
$$;

-- New sign-ups can choose their account type (sent as user metadata).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    case when new.raw_user_meta_data ->> 'account_type' = 'student' then 'student' else 'researcher' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Public profile pages show the account type and study details too.
create or replace function public.get_public_profile(slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'full_name', p.full_name,
      'position', p.position,
      'department', p.department,
      'affiliation', p.affiliation,
      'avatar_url', p.avatar_url,
      'bio', p.bio,
      'research_interests', p.research_interests,
      'orcid', p.orcid,
      'google_scholar', p.google_scholar,
      'website', p.website,
      'public_slug', p.public_slug,
      'account_type', p.account_type,
      'program', p.program,
      'year_of_study', p.year_of_study,
      'supervisor', p.supervisor
    ),
    'publications', coalesce((
      select jsonb_agg(to_jsonb(pub) - 'user_id' order by pub.year desc, pub.created_at desc)
      from public.publications pub
      where pub.user_id = p.id
    ), '[]'::jsonb)
  )
  from public.profiles p
  where p.public_slug = lower(slug) and p.is_public;
$$;

revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- publications: more types + venue
-- ---------------------------------------------------------------------
alter table public.publications add column if not exists venue text;

alter table public.publications drop constraint if exists publications_type_check;
alter table public.publications
  add constraint publications_type_check
  check (type in ('journal', 'conference', 'book', 'chapter', 'thesis', 'report', 'preprint', 'project', 'poster', 'other'));

-- ---------------------------------------------------------------------
-- reading_list
-- ---------------------------------------------------------------------
create table if not exists public.reading_list (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 500),
  authors     text[] not null default '{}',
  year        integer check (year between 1500 and 2100),
  venue       text,
  doi         text,
  url         text,
  status      text not null default 'to_read' check (status in ('to_read', 'reading', 'done')),
  notes       text check (char_length(notes) <= 10000),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reading_list_user_idx on public.reading_list (user_id, status, created_at desc);

create unique index if not exists reading_list_user_doi_key
  on public.reading_list (user_id, lower(doi))
  where doi is not null;

drop trigger if exists reading_list_set_updated_at on public.reading_list;
create trigger reading_list_set_updated_at
  before update on public.reading_list
  for each row execute function public.set_updated_at();

alter table public.reading_list enable row level security;

drop policy if exists "Reading list: read own" on public.reading_list;
create policy "Reading list: read own" on public.reading_list
  for select using (auth.uid() = user_id);

drop policy if exists "Reading list: insert own" on public.reading_list;
create policy "Reading list: insert own" on public.reading_list
  for insert with check (auth.uid() = user_id);

drop policy if exists "Reading list: update own" on public.reading_list;
create policy "Reading list: update own" on public.reading_list
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Reading list: delete own" on public.reading_list;
create policy "Reading list: delete own" on public.reading_list
  for delete using (auth.uid() = user_id);
