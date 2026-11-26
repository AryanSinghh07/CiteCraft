-- =====================================================================
-- CiteCraft v2 — core academic data (schema: public)
-- Tables: profiles, publications, documents
-- Every table uses Row Level Security: users can only touch their own rows.
-- Run in Supabase Dashboard -> SQL Editor (or `supabase db push`).
-- =====================================================================

-- Keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text not null default '',
  email              text,
  affiliation        text,
  position           text,
  department         text,
  avatar_url         text,
  bio                text check (char_length(bio) <= 2000),
  research_interests text[] not null default '{}',
  orcid              text,
  google_scholar     text,
  website            text,
  role               text not null default 'user' check (role in ('user', 'admin')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Profiles: read own" on public.profiles;
create policy "Profiles: read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Users must not be able to promote themselves to admin.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and current_user = 'authenticated' then
    raise exception 'Not allowed to change role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- publications
-- ---------------------------------------------------------------------
create table if not exists public.publications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 500),
  authors     text[] not null default '{}',
  type        text not null check (type in ('journal', 'conference', 'book', 'chapter', 'other')),
  journal     text,
  conference  text,
  book        text,
  year        integer not null check (year between 1900 and 2100),
  doi         text,
  url         text,
  abstract    text,
  citations   integer not null default 0 check (citations >= 0),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists publications_user_id_idx on public.publications (user_id, year desc);

-- The same DOI can't be added twice by one user.
create unique index if not exists publications_user_doi_key
  on public.publications (user_id, lower(doi))
  where doi is not null;

drop trigger if exists publications_set_updated_at on public.publications;
create trigger publications_set_updated_at
  before update on public.publications
  for each row execute function public.set_updated_at();

alter table public.publications enable row level security;

drop policy if exists "Publications: read own" on public.publications;
create policy "Publications: read own" on public.publications
  for select using (auth.uid() = user_id);

drop policy if exists "Publications: insert own" on public.publications;
create policy "Publications: insert own" on public.publications
  for insert with check (auth.uid() = user_id);

drop policy if exists "Publications: update own" on public.publications;
create policy "Publications: update own" on public.publications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Publications: delete own" on public.publications;
create policy "Publications: delete own" on public.publications
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- documents: metadata for files stored in the "documents" storage bucket
-- ---------------------------------------------------------------------
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  publication_id  uuid references public.publications (id) on delete set null,
  name            text not null,
  size_bytes      bigint not null check (size_bytes >= 0),
  mime_type       text not null default 'application/octet-stream',
  storage_path    text not null unique,
  created_at      timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id, created_at desc);

alter table public.documents enable row level security;

drop policy if exists "Documents: read own" on public.documents;
create policy "Documents: read own" on public.documents
  for select using (auth.uid() = user_id);

drop policy if exists "Documents: insert own" on public.documents;
create policy "Documents: insert own" on public.documents
  for insert with check (auth.uid() = user_id);

drop policy if exists "Documents: delete own" on public.documents;
create policy "Documents: delete own" on public.documents
  for delete using (auth.uid() = user_id);
