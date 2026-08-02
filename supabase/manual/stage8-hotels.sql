-- ============================================================
-- Amazingfly Travels — Stage 8: Hotel selection → travel request
-- Run in the Supabase SQL editor for project etfvjtyrsmcsawsdxqgq.
-- Safe to run more than once.
-- ============================================================

-- 1. Hotel detail columns on the EXISTING requests table.
--    No new request table is created — hotel stays are ordinary
--    service_requests rows with service_type = 'Hotel Booking'.
alter table public.service_requests
  add column if not exists hotel_provider_id          text,
  add column if not exists hotel_name                 text,
  add column if not exists hotel_image_url            text,
  add column if not exists hotel_rating               numeric(3,1),
  add column if not exists hotel_location             text,
  add column if not exists hotel_address              text,
  add column if not exists hotel_check_in             date,
  add column if not exists hotel_check_out            date,
  add column if not exists hotel_nights               integer,
  add column if not exists hotel_guests               integer,
  add column if not exists hotel_rooms                integer,
  add column if not exists hotel_room_type            text,
  add column if not exists hotel_board_type           text,
  add column if not exists hotel_cancellation_policy  text,
  add column if not exists hotel_price                numeric(12,2),
  add column if not exists hotel_currency             text,
  -- Prepared for the future booking stage (payment / voucher / confirmation).
  add column if not exists hotel_booking_reference    text,
  add column if not exists hotel_voucher_url          text,
  add column if not exists hotel_booked_at            timestamptz;

create index if not exists service_requests_hotel_provider_idx
  on public.service_requests (hotel_provider_id);

-- 2. Make sure the "Hotel Booking" service exists so requests can link to it.
insert into public.services (name, slug, cta_label, price_label, display_order, active)
select 'Hotel Booking', 'hotel-booking', 'Book a hotel', null,
       coalesce((select max(display_order) from public.services), 0) + 1, true
where not exists (select 1 from public.services where slug = 'hotel-booking');

-- 3. Activity history table already exists from stage 7 (request_updates);
--    hotel selections write into it with status 'new_request'.
--    RLS stays unchanged: requests remain owner-scoped, all writes happen
--    server-side with the service role. No new public grants are added.
