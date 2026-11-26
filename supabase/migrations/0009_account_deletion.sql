-- =====================================================================
-- CiteCraft v2 — let users delete their own account
--
-- public.delete_my_account() deletes the *calling* user's sign-in account.
-- Every table references profiles → auth.users with ON DELETE CASCADE, so all
-- of their data goes with it. The app deletes their stored files first (via
-- the Storage API, which removes the actual files).
-- Requires 0008_security.sql. Safe to run more than once.
-- =====================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  -- Accounts with two-factor authentication must have passed the code check.
  if not public.mfa_satisfied() then
    raise exception 'Two-factor check required';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Allow users to delete attachment files on their own tickets (needed for account deletion).
drop policy if exists "Ticket files: owner delete" on storage.objects;
create policy "Ticket files: owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.tickets t
      where t.id::text = (storage.foldername(name))[1] and t.user_id = auth.uid()
    )
  );
