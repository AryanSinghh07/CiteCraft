-- =====================================================================
-- CiteCraft v2 — security: enforce two-factor authentication
--
-- When a user has a verified authenticator-app factor, their data can only be
-- read or changed from a session that passed the 2FA check (aal2). A stolen
-- password alone is no longer enough — even through the API directly.
-- Users without 2FA are unaffected. Public profile pages (security-definer
-- function) are unaffected. Safe to run more than once.
-- =====================================================================

create or replace function public.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      );
$$;

revoke all on function public.mfa_satisfied() from public;
grant execute on function public.mfa_satisfied() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'publications', 'documents',
    'tickets', 'ticket_messages', 'ticket_attachments',
    'ai_usage', 'document_summaries', 'reading_list',
    'courses', 'class_sessions', 'student_tasks', 'grade_entries'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "Require 2FA when enabled" on public.%I', t);
      -- RESTRICTIVE: must pass in addition to the normal owner policies.
      execute format(
        'create policy "Require 2FA when enabled" on public.%I as restrictive for all to authenticated using (public.mfa_satisfied()) with check (public.mfa_satisfied())',
        t);
    end if;
  end loop;
end;
$$;

-- Stored files (avatars, documents, ticket attachments) follow the same rule.
drop policy if exists "Require 2FA when enabled" on storage.objects;
create policy "Require 2FA when enabled" on storage.objects
  as restrictive for all to authenticated
  using (public.mfa_satisfied())
  with check (public.mfa_satisfied());
