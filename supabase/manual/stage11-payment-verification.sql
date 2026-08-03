-- ============================================================================
-- Amazingfly Travels — Stage 11: Paystack verification & booking confirmation
-- Run in the Supabase SQL editor. Safe to re-run.
-- Only adds columns used by the confirmation flow; nothing is dropped.
-- ============================================================================

alter table public.service_requests
  add column if not exists booking_status      text default 'pending',
  add column if not exists booking_reference   text,
  add column if not exists airline_reference   text,
  add column if not exists voucher_url         text;

create index if not exists service_requests_booking_status_idx
  on public.service_requests (booking_status);

-- payment_transactions already has provider_response (jsonb), paid_at and
-- payment_method from stage9-payments.sql. Nothing further is required there.
