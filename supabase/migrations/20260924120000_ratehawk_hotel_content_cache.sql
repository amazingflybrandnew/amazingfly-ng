-- Repository copy of the table already present in Supabase (verified 2026-09-24).
-- Cache of RateHawk/ETG hotel static content (Content API hotel_content_by_ids).
-- ETG certification: static content must not be fetched in real time on every
-- search. The server reads this cache and only calls the Content API for hotels
-- seen for the first time or whose content is missing/older than 7 days.
create table if not exists public.ratehawk_hotel_content_cache (
  hotel_key text primary key,          -- "hid:<number>" or the ETG string id
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists ratehawk_hotel_content_cache_updated_at_idx
  on public.ratehawk_hotel_content_cache (updated_at);

-- Server-side (service role) access only; no public policies.
alter table public.ratehawk_hotel_content_cache enable row level security;
