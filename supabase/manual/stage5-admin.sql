-- ============================================================
-- AMAZINGFLY.NG — STAGE 5 (Part 1): Admin foundation
-- Run this whole file in the Supabase SQL Editor (project etfvjtyrsmcsawsdxqgq).
-- Safe to re-run.
-- ============================================================

-- 1. ADMIN ROLES ---------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type public.admin_role as enum ('super_admin', 'travel_agent', 'support_staff');
  end if;
end
$$;

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.admin_role not null default 'support_staff',
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists admin_profiles_user_id_idx on public.admin_profiles (user_id);

grant select on public.admin_profiles to authenticated;
grant all on public.admin_profiles to service_role;

alter table public.admin_profiles enable row level security;

-- Security definer helper so policies never recurse.
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where user_id = _user_id and is_active
  );
$$;

create or replace function public.has_admin_role(_user_id uuid, _role public.admin_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where user_id = _user_id and is_active and role = _role
  );
$$;

drop policy if exists "Admins read admin profiles" on public.admin_profiles;
create policy "Admins read admin profiles" on public.admin_profiles
  for select to authenticated using (public.is_admin(auth.uid()));

-- 2. REQUEST MANAGEMENT COLUMNS ------------------------------
alter table public.service_requests
  add column if not exists assigned_staff_id uuid references public.admin_profiles(id) on delete set null;

alter table public.service_requests
  add column if not exists priority text not null default 'normal';

alter table public.service_requests
  drop constraint if exists service_requests_priority_check;
alter table public.service_requests
  add constraint service_requests_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

create index if not exists service_requests_assigned_staff_idx
  on public.service_requests (assigned_staff_id);
create index if not exists service_requests_status_idx
  on public.service_requests (request_status);

-- 3. REQUEST UPDATES (activity history) ----------------------
create table if not exists public.request_updates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  status text,
  message text,
  created_at timestamptz not null default now()
);

alter table public.request_updates
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists request_updates_request_id_idx on public.request_updates (request_id);

grant select on public.request_updates to authenticated;
grant all on public.request_updates to service_role;

alter table public.request_updates enable row level security;

drop policy if exists "Users read own request updates" on public.request_updates;
create policy "Users read own request updates" on public.request_updates
  for select to authenticated
  using (
    exists (
      select 1 from public.service_requests r
      where r.id = request_updates.request_id
        and (
          r.user_id = auth.uid()
          or lower(r.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

drop policy if exists "Admins read all request updates" on public.request_updates;
create policy "Admins read all request updates" on public.request_updates
  for select to authenticated using (public.is_admin(auth.uid()));

-- 4. INTERNAL NOTES (staff only — never visible to customers) -
create table if not exists public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  admin_id uuid references public.admin_profiles(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists internal_notes_request_id_idx on public.internal_notes (request_id, created_at desc);

grant select, insert on public.internal_notes to authenticated;
grant all on public.internal_notes to service_role;

alter table public.internal_notes enable row level security;

drop policy if exists "Admins read internal notes" on public.internal_notes;
create policy "Admins read internal notes" on public.internal_notes
  for select to authenticated using (public.is_admin(auth.uid()));

drop policy if exists "Admins write internal notes" on public.internal_notes;
create policy "Admins write internal notes" on public.internal_notes
  for insert to authenticated with check (public.is_admin(auth.uid()));

-- 5. DOCUMENT REVIEW STATE -----------------------------------
alter table public.uploaded_documents
  add column if not exists review_status text not null default 'pending';
alter table public.uploaded_documents
  drop constraint if exists uploaded_documents_review_status_check;
alter table public.uploaded_documents
  add constraint uploaded_documents_review_status_check
  check (review_status in ('pending', 'approved', 'rejected'));
alter table public.uploaded_documents
  add column if not exists review_note text;

-- 6. ADMIN READ ACCESS TO CUSTOMER DATA ----------------------
drop policy if exists "Admins read all requests" on public.service_requests;
create policy "Admins read all requests" on public.service_requests
  for select to authenticated using (public.is_admin(auth.uid()));

drop policy if exists "Admins read all documents" on public.uploaded_documents;
create policy "Admins read all documents" on public.uploaded_documents
  for select to authenticated using (public.is_admin(auth.uid()));

drop policy if exists "Admins read all document requests" on public.document_requests;
create policy "Admins read all document requests" on public.document_requests
  for select to authenticated using (public.is_admin(auth.uid()));

-- Customers keep their own-row policies from Stage 4 — nothing is widened for them.

-- 7. STATUS CHANGE → history + customer notification ---------
-- The admin dashboard writes its own request_updates row (with created_by)
-- immediately before changing the status, so the trigger only fills the gap
-- for status changes made directly in the Supabase table editor.
create or replace function public.handle_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  already_logged boolean;
begin
  if new.request_status is distinct from old.request_status then
    select exists (
      select 1 from public.request_updates u
      where u.request_id = new.id
        and u.status = new.request_status
        and u.created_at > now() - interval '15 seconds'
    ) into already_logged;

    if not already_logged then
      insert into public.request_updates (request_id, status, message)
      values (new.id, new.request_status, 'Status updated to ' || new.request_status);
    end if;

    if new.user_id is not null then
      insert into public.notifications (user_id, request_id, title, message)
      values (
        new.user_id,
        new.id,
        'Update on request ' || coalesce(new.request_reference, ''),
        'Your request is now: ' || new.request_status
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_request_status_change on public.service_requests;
create trigger on_request_status_change
  after update on public.service_requests
  for each row execute function public.handle_request_status_change();

-- 8. CREATE YOUR FIRST ADMIN ---------------------------------
-- Sign up normally on Amazingfly.ng with the staff email first, then run:
--
--   insert into public.admin_profiles (user_id, full_name, role)
--   select id, coalesce(raw_user_meta_data ->> 'full_name', email), 'super_admin'
--   from auth.users
--   where email = 'you@amazingfly.ng'
--   on conflict (user_id) do update set role = 'super_admin', is_active = true;
--
-- Roles: 'super_admin' | 'travel_agent' | 'support_staff'
