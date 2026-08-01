-- =====================================================================
-- Amazingfly Travels - Stage 3 schema (project etfvjtyrsmcsawsdxqgq)
-- Run once in Supabase SQL Editor. Safe to re-run (idempotent).
-- =====================================================================

-- 1. Customers ---------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text,
  whatsapp text,
  nationality text,
  country_of_residence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
-- No anon policies: the public website writes only through the server
-- (service role), so no browser can read or edit customer records.

-- 2. service_requests: workflow + travel columns -----------------------
alter table public.service_requests
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists service_type text,
  add column if not exists origin_country text,
  add column if not exists destination_country text,
  add column if not exists travel_purpose text,
  add column if not exists return_date date,
  add column if not exists traveller_count integer not null default 1,
  add column if not exists passport_number text,
  add column if not exists passport_country text,
  add column if not exists date_of_birth date,
  add column if not exists passport_issue_date date,
  add column if not exists passport_expiry_date date,
  add column if not exists assigned_staff text;

-- Status values used by the app and the future admin dashboard.
alter table public.service_requests
  add column if not exists request_status text not null default 'new_request';

-- IMPORTANT: drop any previous constraint BEFORE rewriting values, otherwise the
-- old Stage-2 check ('received', 'contacted', ...) rejects the new values.
alter table public.service_requests
  drop constraint if exists service_requests_request_status_check;

update public.service_requests
   set request_status = case request_status
     when 'received' then 'new_request'
     when 'contacted' then 'under_review'
     when 'awaiting_information' then 'documents_required'
     when 'quotation_sent' then 'under_review'
     when 'processing' then 'processing'
     when 'approved' then 'approved'
     when 'completed' then 'completed'
     when 'cancelled' then 'cancelled'
     when 'new_request' then 'new_request'
     when 'under_review' then 'under_review'
     when 'documents_required' then 'documents_required'
     else 'new_request'
   end
 where request_status is null
    or request_status not in (
      'new_request', 'under_review', 'documents_required',
      'processing', 'approved', 'completed', 'cancelled'
    );

alter table public.service_requests
  alter column request_status set default 'new_request';

alter table public.service_requests
  add constraint service_requests_request_status_check
  check (request_status in (
    'new_request', 'under_review', 'documents_required',
    'processing', 'approved', 'completed', 'cancelled'
  ));


create index if not exists service_requests_customer_id_idx on public.service_requests (customer_id);
create index if not exists service_requests_status_idx on public.service_requests (request_status);

-- 3. Uploaded documents ------------------------------------------------
create table if not exists public.uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  document_type text not null,
  file_url text not null,
  file_name text,
  file_size integer,
  uploaded_at timestamptz not null default now()
);

grant select, insert, update, delete on public.uploaded_documents to authenticated;
grant all on public.uploaded_documents to service_role;
alter table public.uploaded_documents enable row level security;
-- No anon policies: uploads are recorded server-side only.

create index if not exists uploaded_documents_request_id_idx on public.uploaded_documents (request_id);

-- 4. Storage -----------------------------------------------------------
-- The private bucket "request-documents" is already created.
-- Browsers upload with short-lived signed URLs issued by the server, so no
-- storage.objects policies for anon are needed (and none should be added).
