-- ============================================================
-- Amazingfly.ng — Stage 4 improvement: customer document requests
-- Run this in the Supabase SQL editor of project etfvjtyrsmcsawsdxqgq.
-- Safe to run more than once.
-- ============================================================

-- 1. Table: documents our specialists ask a customer to provide
create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  document_name text not null,
  description text,
  required_status text not null default 'required',
  uploaded_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_requests
  drop constraint if exists document_requests_required_status_check;
alter table public.document_requests
  add constraint document_requests_required_status_check
  check (required_status in ('required', 'optional'));

alter table public.document_requests
  drop constraint if exists document_requests_uploaded_status_check;
alter table public.document_requests
  add constraint document_requests_uploaded_status_check
  check (uploaded_status in ('pending', 'uploaded', 'approved', 'rejected'));

create index if not exists document_requests_request_id_idx
  on public.document_requests (request_id);

-- 2. Link an uploaded file to the document request it satisfies
alter table public.uploaded_documents
  add column if not exists document_request_id uuid
  references public.document_requests(id) on delete set null;

create index if not exists uploaded_documents_document_request_id_idx
  on public.uploaded_documents (document_request_id);

-- 3. Notifications can deep-link to the request they refer to
alter table public.notifications
  add column if not exists request_id uuid
  references public.service_requests(id) on delete cascade;

-- 4. Grants (PostgREST needs these explicitly)
grant select on public.document_requests to authenticated;
grant all on public.document_requests to service_role;

-- 5. Row Level Security — customers only ever see their own rows.
alter table public.document_requests enable row level security;

drop policy if exists "Customers read own document requests" on public.document_requests;
create policy "Customers read own document requests"
on public.document_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.service_requests sr
    where sr.id = document_requests.request_id
      and sr.user_id = auth.uid()
  )
);

-- No insert/update/delete policy: only the service role (our server functions
-- and the future admin dashboard) may create or change document requests.

-- 6. Keep updated_at fresh
create or replace function public.touch_document_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists document_requests_touch on public.document_requests;
create trigger document_requests_touch
before update on public.document_requests
for each row execute function public.touch_document_requests();

-- 7. When a document request is created, notify the customer
create or replace function public.notify_document_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
  reference text;
begin
  select sr.user_id, sr.request_reference
    into target_user, reference
  from public.service_requests sr
  where sr.id = new.request_id;

  if target_user is not null then
    insert into public.notifications (user_id, title, message, read_status, request_id)
    values (
      target_user,
      'Document required',
      'Please upload "' || new.document_name || '" for request ' || coalesce(reference, '') || '.',
      false,
      new.request_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists document_requests_notify on public.document_requests;
create trigger document_requests_notify
after insert on public.document_requests
for each row execute function public.notify_document_request();
