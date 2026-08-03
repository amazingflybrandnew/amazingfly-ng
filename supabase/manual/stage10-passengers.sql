-- ============================================================
-- Amazingfly Travels — Stage 10: Passenger details + airline hold booking
-- Run in the Supabase SQL editor for project etfvjtyrsmcsawsdxqgq.
-- Safe to run more than once.
-- ============================================================

-- 1. Booking contact + airline booking fields on the EXISTING requests table.
alter table public.service_requests
  add column if not exists contact_country          text,
  add column if not exists passengers_completed_at  timestamptz,
  add column if not exists pnr                      text,
  add column if not exists duffel_order_id          text,
  add column if not exists airline_reference        text,
  add column if not exists hold_expires_at          timestamptz,
  add column if not exists payment_deadline         timestamptz;

create index if not exists service_requests_duffel_order_idx
  on public.service_requests (duffel_order_id);

-- 2. Travellers for a booking (one row per passenger).
create table if not exists public.booking_passengers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  title text not null default 'mr',
  first_name text not null,
  middle_name text,
  last_name text not null,
  date_of_birth date,
  gender text,
  nationality text,
  passport_number text,
  passport_country text,
  passport_expiry date,
  created_at timestamptz not null default now()
);

create index if not exists booking_passengers_request_idx
  on public.booking_passengers (request_id);

grant select on public.booking_passengers to authenticated;
grant all on public.booking_passengers to service_role;

alter table public.booking_passengers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'booking_passengers'
      and policyname = 'Customers read passengers on their own requests'
  ) then
    create policy "Customers read passengers on their own requests"
      on public.booking_passengers
      for select
      to authenticated
      using (
        exists (
          select 1 from public.service_requests r
          where r.id = booking_passengers.request_id
            and r.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Writes stay server-side through the service role only.
