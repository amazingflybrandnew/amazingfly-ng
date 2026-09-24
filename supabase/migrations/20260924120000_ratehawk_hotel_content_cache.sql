-- Cache of RateHawk/ETG hotel static content (Content API hotel_content_by_ids).
-- ETG certification: static content must not be fetched in real time on every
-- search. The server reads this cache and only calls the Content API for hotels
-- seen for the first time or whose content is missing/older than the refresh window.
create table if not exists public.ratehawk_hotel_content (
  hotel_key text primary key,          -- "hid:<number>" or the ETG string id
  hid bigint null,
  content jsonb not null,
  fetched_at timestamptz not null default now()
);

create index if not exists ratehawk_hotel_content_fetched_idx
  on public.ratehawk_hotel_content (fetched_at);

-- Server-side (service role) access only; no public policies.
alter table public.ratehawk_hotel_content enable row level security;

comment on table public.ratehawk_hotel_content is 'Server-side cache of ETG hotel static content. Contains no customer data.';
