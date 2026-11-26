-- =====================================================================
-- CiteCraft v2 — AI assistant and document summarizer
--   ai_usage            : one row per AI request, used for daily limits
--   document_summaries  : saved summaries (history)
-- The edge functions in supabase/functions act as the signed-in user, so
-- these rules apply to them too. Safe to run more than once.
-- =====================================================================

create table if not exists public.ai_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('chat', 'summary')),
  created_at  timestamptz not null default now()
);

create index if not exists ai_usage_user_kind_idx on public.ai_usage (user_id, kind, created_at desc);

alter table public.ai_usage enable row level security;

-- Users can see and add their own usage, but never edit or delete it
-- (otherwise they could reset their daily limit).
drop policy if exists "AI usage: read own" on public.ai_usage;
create policy "AI usage: read own" on public.ai_usage
  for select using (auth.uid() = user_id);

drop policy if exists "AI usage: insert own" on public.ai_usage;
create policy "AI usage: insert own" on public.ai_usage
  for insert with check (auth.uid() = user_id and created_at > now() - interval '1 minute');

-- ---------------------------------------------------------------------
create table if not exists public.document_summaries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  file_name   text not null check (char_length(file_name) between 1 and 255),
  mime_type   text not null default 'application/octet-stream',
  size_bytes  bigint not null default 0 check (size_bytes >= 0),
  length      text not null default 'standard' check (length in ('brief', 'standard', 'detailed')),
  focus       text not null default 'general',
  summary     text not null check (char_length(summary) between 1 and 100000),
  created_at  timestamptz not null default now()
);

create index if not exists document_summaries_user_idx on public.document_summaries (user_id, created_at desc);

alter table public.document_summaries enable row level security;

drop policy if exists "Summaries: read own" on public.document_summaries;
create policy "Summaries: read own" on public.document_summaries
  for select using (auth.uid() = user_id);

drop policy if exists "Summaries: insert own" on public.document_summaries;
create policy "Summaries: insert own" on public.document_summaries
  for insert with check (auth.uid() = user_id);

drop policy if exists "Summaries: delete own" on public.document_summaries;
create policy "Summaries: delete own" on public.document_summaries
  for delete using (auth.uid() = user_id);
