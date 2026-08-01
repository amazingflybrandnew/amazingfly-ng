-- =====================================================================
-- Amazingfly Travels - Stage 3.1: dynamic service-specific request system
-- Run once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- Requires stage3.sql to have been run first.
-- =====================================================================

-- 1. Dynamic form definition tables ------------------------------------
create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

grant select on public.service_categories to anon, authenticated;
grant all on public.service_categories to service_role;
alter table public.service_categories enable row level security;

drop policy if exists "Public can read active service categories" on public.service_categories;
create policy "Public can read active service categories"
  on public.service_categories for select
  to anon, authenticated
  using (active);

create table if not exists public.service_questions (
  id uuid primary key default gen_random_uuid(),
  service_category_id uuid not null references public.service_categories(id) on delete cascade,
  question text not null,
  field_key text not null,
  field_type text not null default 'text',
  required boolean not null default false,
  options jsonb,
  section text,
  display_order integer not null default 0,
  active boolean not null default true,
  unique (service_category_id, field_key)
);

grant select on public.service_questions to anon, authenticated;
grant all on public.service_questions to service_role;
alter table public.service_questions enable row level security;

drop policy if exists "Public can read service questions" on public.service_questions;
create policy "Public can read service questions"
  on public.service_questions for select
  to anon, authenticated
  using (active);

create table if not exists public.service_documents (
  id uuid primary key default gen_random_uuid(),
  service_category_id uuid not null references public.service_categories(id) on delete cascade,
  document_key text not null,
  document_name text not null,
  hint text,
  required boolean not null default false,
  display_order integer not null default 0,
  unique (service_category_id, document_key)
);

grant select on public.service_documents to anon, authenticated;
grant all on public.service_documents to service_role;
alter table public.service_documents enable row level security;

drop policy if exists "Public can read service documents" on public.service_documents;
create policy "Public can read service documents"
  on public.service_documents for select
  to anon, authenticated
  using (true);

-- 2. service_requests: dynamic answers ---------------------------------
alter table public.service_requests
  add column if not exists service_category text,
  add column if not exists answers jsonb not null default '[]'::jsonb;

create index if not exists service_requests_service_category_idx
  on public.service_requests (service_category);

-- 3. Seed the categories used by the website ---------------------------
insert into public.service_categories (key, name, description, display_order) values
  ('visa', 'Visa Application', 'Tourist, business, student, work, family visit or transit visas.', 1),
  ('flight', 'Flight Booking', 'Reservations, confirmed tickets and fare options.', 2),
  ('hotel', 'Hotel Booking', 'Accommodation reservations worldwide.', 3),
  ('documents', 'Travel Documents', 'Passport support, invitation letters, itineraries and more.', 4),
  ('insurance', 'Travel Insurance', 'Embassy-accepted travel medical insurance.', 5),
  ('airport_transfer', 'Airport Transfer', 'Reliable pick-up and drop-off around your flight.', 6),
  ('other', 'Other Services', 'Anything else — tell us what you need.', 7)
on conflict (key) do update
  set name = excluded.name,
      description = excluded.description,
      display_order = excluded.display_order;
