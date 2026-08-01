-- ============================================================
-- AMAZINGFLY.NG — STAGE 4: Customer Accounts & Dashboard
-- Run this whole file in the Supabase SQL Editor (project etfvjtyrsmcsawsdxqgq).
-- Safe to re-run.
-- ============================================================

-- 1. PROFILES ------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  nationality text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 2. LINK REQUESTS TO ACCOUNTS -------------------------------
alter table public.service_requests
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists service_requests_user_id_idx on public.service_requests (user_id);
create index if not exists service_requests_email_idx on public.service_requests (lower(email));

grant select on public.service_requests to authenticated;

drop policy if exists "Users read own requests" on public.service_requests;
create policy "Users read own requests" on public.service_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- 3. REQUEST UPDATES (timeline history) ----------------------
create table if not exists public.request_updates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  status text,
  message text,
  created_at timestamptz not null default now()
);

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

-- 4. NOTIFICATIONS -------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.service_requests(id) on delete cascade,
  title text not null,
  message text not null default '',
  read_status boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);

grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 5. DOCUMENTS: owner read access ----------------------------
grant select on public.uploaded_documents to authenticated;

drop policy if exists "Users read own documents" on public.uploaded_documents;
create policy "Users read own documents" on public.uploaded_documents
  for select to authenticated
  using (
    exists (
      select 1 from public.service_requests r
      where r.id = uploaded_documents.request_id
        and (
          r.user_id = auth.uid()
          or lower(r.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

-- 6. AUTO-CREATE PROFILE ON SIGNUP ---------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, nationality)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'nationality', '')
  )
  on conflict (id) do nothing;

  -- Claim any requests submitted with this email before signup.
  update public.service_requests
    set user_id = new.id
  where user_id is null
    and lower(email) = lower(coalesce(new.email, ''));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7. LOG A TIMELINE ENTRY + NOTIFICATION ON STATUS CHANGE ----
create or replace function public.handle_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.request_status is distinct from old.request_status then
    insert into public.request_updates (request_id, status, message)
    values (new.id, new.request_status, 'Status updated to ' || new.request_status);

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
