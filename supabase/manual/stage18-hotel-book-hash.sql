-- Stage 18: persist the confirmed RateHawk prebook hash on hotel requests.
alter table public.service_requests
  add column if not exists hotel_book_hash text;
