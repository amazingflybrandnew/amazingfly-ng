-- ============================================================
-- Amazingfly Travels — Stage 7: Flight selection → travel request
-- Run in the Supabase SQL editor for project etfvjtyrsmcsawsdxqgq.
-- Safe to run more than once.
-- ============================================================

-- 1. Flight detail columns on the EXISTING requests table.
--    No new request table is created — flight bookings are ordinary
--    service_requests rows with service_type = 'Flight Booking'.
alter table public.service_requests
  add column if not exists flight_offer_id       text,
  add column if not exists airline               text,
  add column if not exists airline_logo_url      text,
  add column if not exists flight_number         text,
  add column if not exists flight_origin         text,
  add column if not exists flight_destination    text,
  add column if not exists flight_departure_at   timestamptz,
  add column if not exists flight_arrival_at     timestamptz,
  add column if not exists flight_duration       text,
  add column if not exists flight_stops          integer,
  add column if not exists cabin_class           text,
  add column if not exists passenger_count       integer,
  add column if not exists flight_price          numeric(12,2),
  add column if not exists flight_currency       text,
  -- Prepared for the future booking stage (payment / ticketing).
  add column if not exists booking_status        text default 'not_booked',
  add column if not exists booking_reference     text,
  add column if not exists ticket_number         text,
  add column if not exists booking_confirmed_at  timestamptz;

create index if not exists service_requests_flight_offer_idx
  on public.service_requests (flight_offer_id);

-- 2. Make sure the "Flight Booking" service exists so requests can link to it.
insert into public.services (name, slug, cta_label, price_label, display_order, active)
select 'Flight Booking', 'flight-booking', 'Book a flight', null,
       coalesce((select max(display_order) from public.services), 0) + 1, true
where not exists (select 1 from public.services where slug = 'flight-booking');

-- 3. Activity history for a request (already used by the admin timeline).
create table if not exists public.request_updates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  status text,
  message text,
  created_by uuid,
  created_at timestamptz not null default now()
);

grant select on public.request_updates to authenticated;
grant all on public.request_updates to service_role;

alter table public.request_updates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'request_updates'
      and policyname = 'Customers read updates on their own requests'
  ) then
    create policy "Customers read updates on their own requests"
      on public.request_updates
      for select
      to authenticated
      using (
        exists (
          select 1 from public.service_requests r
          where r.id = request_updates.request_id
            and r.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- 4. Requests stay owner-scoped; writes remain server-side (service role).
--    No new public read/update/delete grants are added here.
