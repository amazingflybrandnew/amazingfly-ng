-- ============================================================
-- Amazingfly Travels — Stage 17: RateHawk hotel booking process
-- Run in the Supabase SQL editor for project etfvjtyrsmcsawsdxqgq.
-- Safe to run more than once.
-- Touches hotels only — flights, visas, documents and payments unchanged.
-- ============================================================

create table if not exists public.hotel_bookings (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid references public.service_requests(id) on delete set null,
  partner_order_id  text not null unique,
  book_hash         text,
  order_id          text,
  item_id           text,
  -- created | started | processing | ok | failed
  status            text not null default 'created',
  provider_status   text,
  provider_reference text,
  error_message     text,
  attempts          integer not null default 0,
  payload           jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists hotel_bookings_request_idx
  on public.hotel_bookings (request_id);
create index if not exists hotel_bookings_status_idx
  on public.hotel_bookings (status);

-- Data API access. All reads/writes happen through server code with the
-- service role, so no anon/authenticated grants are required.
grant all on public.hotel_bookings to service_role;

alter table public.hotel_bookings enable row level security;

-- No permissive policies: only the service role (which bypasses RLS) touches
-- this table. Add a narrow authenticated policy later if customers need
-- direct reads.
