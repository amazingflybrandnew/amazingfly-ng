-- Stage 19 — persist the RateHawk payment method selected after prebook.
-- Hotel-only, nullable and backward-compatible.

alter table public.service_requests
  add column if not exists hotel_payment_type text,
  add column if not exists hotel_payment_requires_card boolean,
  add column if not exists hotel_payment_requires_cvc boolean,
  add column if not exists hotel_provider_payment_amount numeric,
  add column if not exists hotel_provider_payment_currency text;

comment on column public.service_requests.hotel_payment_type is
  'RateHawk payment type selected after prebook: deposit, hotel, or now.';
