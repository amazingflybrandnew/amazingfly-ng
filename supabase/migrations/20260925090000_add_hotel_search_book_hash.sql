-- Repository copy of the migration applied in Supabase on 2026-09-25.
alter table public.service_requests add column if not exists hotel_search_book_hash text null;
comment on column public.service_requests.hotel_search_book_hash is 'RateHawk hotelpage book_hash of the selected rate; re-prebooked right before booking/form so the booking uses a fresh prebook hash.';
