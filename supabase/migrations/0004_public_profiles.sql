-- =====================================================================
-- CiteCraft v2 — public profile pages (/u/<slug>)
-- A user can opt in to a shareable page showing their profile and
-- publications. Visitors (not signed in) read it only through
-- get_public_profile(), which returns safe fields — never the email,
-- role or anything from private tables. Safe to run more than once.
-- =====================================================================

alter table public.profiles add column if not exists is_public boolean not null default false;
alter table public.profiles add column if not exists public_slug text;

-- 3–40 chars: lowercase letters, numbers and single hyphens, no hyphen at the ends.
do $$
begin
  alter table public.profiles
    add constraint profiles_public_slug_format
    check (public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(public_slug) between 3 and 40);
exception
  when duplicate_object then null;
end;
$$;

create unique index if not exists profiles_public_slug_key
  on public.profiles (public_slug)
  where public_slug is not null;

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
      'public_slug', p.public_slug
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
