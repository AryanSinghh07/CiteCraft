-- =====================================================================
-- CiteCraft v2 — support ticket system
-- Tables: tickets, ticket_messages, ticket_attachments
-- Storage bucket: ticket-attachments (private)
--
-- Access rules
--   users  : see / reply to their own tickets, never see internal notes,
--            may only reopen, close or rate their own tickets
--   admins : see and manage every ticket (profiles.role = 'admin')
-- Safe to run more than once.
-- =====================================================================

-- Is the current user an admin? (security definer so it can read profiles under RLS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Admins can read every profile (requester details, list of admins for assignment).
drop policy if exists "Profiles: admins read all" on public.profiles;
create policy "Profiles: admins read all" on public.profiles
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- tickets
-- ---------------------------------------------------------------------
create sequence if not exists public.ticket_number_seq start 1001;

create table if not exists public.tickets (
  id               uuid primary key default gen_random_uuid(),
  ticket_number    bigint not null unique default nextval('public.ticket_number_seq'),
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  requester_name   text not null default '',
  requester_email  text not null default '',
  subject          text not null check (char_length(subject) between 3 and 200),
  description      text not null check (char_length(description) between 1 and 5000),
  category         text not null default 'other'
                     check (category in ('bug', 'account', 'publication', 'feature', 'other')),
  priority         text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status           text not null default 'open'
                     check (status in ('open', 'in_progress', 'waiting_on_user', 'resolved', 'closed')),
  assigned_to      uuid references public.profiles (id) on delete set null,
  rating           smallint check (rating between 1 and 5),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  closed_at        timestamptz
);

alter sequence public.ticket_number_seq owned by public.tickets.ticket_number;

create index if not exists tickets_user_id_idx on public.tickets (user_id, updated_at desc);
create index if not exists tickets_status_idx on public.tickets (status, priority, updated_at desc);

-- Fill requester details and enforce what non-admins may change.
create or replace function public.tickets_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin boolean := public.is_admin();
begin
  if tg_op = 'INSERT' then
    select coalesce(p.full_name, ''), coalesce(p.email, '')
      into new.requester_name, new.requester_email
      from public.profiles p where p.id = new.user_id;
    if not admin then
      new.status := 'open';
      new.assigned_to := null;
      new.rating := null;
    end if;
    return new;
  end if;

  -- UPDATE. pg_trigger_depth() > 1 means the change comes from another trigger
  -- (e.g. a reply moving the status), which is trusted.
  if not admin and pg_trigger_depth() = 1 then
    if new.subject is distinct from old.subject
       or new.description is distinct from old.description
       or new.category is distinct from old.category
       or new.priority is distinct from old.priority
       or new.assigned_to is distinct from old.assigned_to
       or new.user_id is distinct from old.user_id
       or new.ticket_number is distinct from old.ticket_number then
      raise exception 'Only support staff can change these ticket fields';
    end if;
    if new.status is distinct from old.status
       and not (new.status = 'closed'
                or (new.status = 'open' and old.status in ('resolved', 'closed'))) then
      raise exception 'You can only close or reopen your ticket';
    end if;
    if new.rating is distinct from old.rating and new.status not in ('resolved', 'closed') then
      raise exception 'Tickets can be rated once they are resolved';
    end if;
  end if;

  if new.status is distinct from old.status then
    new.resolved_at := case when new.status = 'resolved' then now()
                            when new.status = 'closed' then coalesce(old.resolved_at, now())
                            else null end;
    new.closed_at := case when new.status = 'closed' then now() else null end;
    if new.status = 'open' then new.rating := null; end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tickets_before_write on public.tickets;
create trigger tickets_before_write
  before insert or update on public.tickets
  for each row execute function public.tickets_before_write();

alter table public.tickets enable row level security;

drop policy if exists "Tickets: read own or admin" on public.tickets;
create policy "Tickets: read own or admin" on public.tickets
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Tickets: create own" on public.tickets;
create policy "Tickets: create own" on public.tickets
  for insert with check (auth.uid() = user_id);

drop policy if exists "Tickets: update own or admin" on public.tickets;
create policy "Tickets: update own or admin" on public.tickets
  for update using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Tickets: admin delete" on public.tickets;
create policy "Tickets: admin delete" on public.tickets
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------
-- ticket_messages: the conversation thread
-- ---------------------------------------------------------------------
create table if not exists public.ticket_messages (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.tickets (id) on delete cascade,
  author_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  author_name  text not null default '',
  author_role  text not null default 'user' check (author_role in ('user', 'admin')),
  body         text not null check (char_length(body) between 1 and 5000),
  is_internal  boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

create or replace function public.ticket_messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin boolean := public.is_admin();
begin
  select coalesce(p.full_name, ''), case when admin then 'admin' else 'user' end
    into new.author_name, new.author_role
    from public.profiles p where p.id = new.author_id;
  if not admin then
    new.is_internal := false;
  end if;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists ticket_messages_before_insert on public.ticket_messages;
create trigger ticket_messages_before_insert
  before insert on public.ticket_messages
  for each row execute function public.ticket_messages_before_insert();

-- A reply moves the ticket along automatically.
create or replace function public.ticket_messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_internal then
    update public.tickets set updated_at = now() where id = new.ticket_id;
  elsif new.author_role = 'user' then
    -- requester replied: back to the support queue
    update public.tickets
       set status = case when status in ('waiting_on_user', 'resolved') then 'open' else status end,
           updated_at = now()
     where id = new.ticket_id;
  else
    -- staff replied: pick up an open ticket
    update public.tickets
       set status = case when status = 'open' then 'in_progress' else status end,
           updated_at = now()
     where id = new.ticket_id;
  end if;
  return new;
end;
$$;

drop trigger if exists ticket_messages_after_insert on public.ticket_messages;
create trigger ticket_messages_after_insert
  after insert on public.ticket_messages
  for each row execute function public.ticket_messages_after_insert();

alter table public.ticket_messages enable row level security;

drop policy if exists "Ticket messages: read" on public.ticket_messages;
create policy "Ticket messages: read" on public.ticket_messages
  for select using (
    public.is_admin()
    or (not is_internal and exists (
      select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid()))
  );

drop policy if exists "Ticket messages: write" on public.ticket_messages;
create policy "Ticket messages: write" on public.ticket_messages
  for insert with check (
    author_id = auth.uid()
    and (public.is_admin()
         or exists (select 1 from public.tickets t
                    where t.id = ticket_id and t.user_id = auth.uid() and t.status <> 'closed'))
  );

-- ---------------------------------------------------------------------
-- ticket_attachments: files on a ticket (stored in the ticket-attachments bucket)
-- ---------------------------------------------------------------------
create table if not exists public.ticket_attachments (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.tickets (id) on delete cascade,
  message_id    uuid references public.ticket_messages (id) on delete cascade,
  uploaded_by   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name          text not null,
  size_bytes    bigint not null check (size_bytes between 0 and 5242880),
  mime_type     text not null default 'application/octet-stream',
  storage_path  text not null unique,
  created_at    timestamptz not null default now()
);

create index if not exists ticket_attachments_ticket_idx on public.ticket_attachments (ticket_id);

alter table public.ticket_attachments enable row level security;

drop policy if exists "Ticket attachments: read" on public.ticket_attachments;
create policy "Ticket attachments: read" on public.ticket_attachments
  for select using (
    public.is_admin()
    or exists (select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

drop policy if exists "Ticket attachments: write" on public.ticket_attachments;
create policy "Ticket attachments: write" on public.ticket_attachments
  for insert with check (
    uploaded_by = auth.uid()
    and (public.is_admin()
         or exists (select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid()))
  );

-- Storage: files live under "<ticket id>/..."
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-attachments', 'ticket-attachments', false, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_ticket(ticket uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
      or exists (select 1 from public.tickets t where t.id = ticket and t.user_id = auth.uid());
$$;

drop policy if exists "Ticket files: read" on storage.objects;
create policy "Ticket files: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'ticket-attachments'
         and public.can_access_ticket(((storage.foldername(name))[1])::uuid));

drop policy if exists "Ticket files: upload" on storage.objects;
create policy "Ticket files: upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ticket-attachments'
              and public.can_access_ticket(((storage.foldername(name))[1])::uuid));
