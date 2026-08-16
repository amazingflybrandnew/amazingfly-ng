-- Stage 20 — Featured Services CMS.
-- Applied to the live Amazingfly Travels Supabase project via migration: featured_services_cms.

create table if not exists public.featured_services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image_url text,
  link_path text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint featured_services_title_length check (char_length(btrim(title)) between 2 and 160),
  constraint featured_services_description_length check (char_length(description) <= 2000),
  constraint featured_services_link_path check (link_path ~ '^/[^[:space:]]*$'),
  constraint featured_services_display_order check (display_order between 0 and 999)
);

create index if not exists featured_services_active_order_idx
  on public.featured_services (is_active, display_order, created_at);

alter table public.featured_services enable row level security;

revoke all on table public.featured_services from anon, authenticated;
grant select on table public.featured_services to anon, authenticated;
grant select, insert, update, delete on table public.featured_services to service_role;

drop policy if exists "Public read active featured services" on public.featured_services;
create policy "Public read active featured services"
  on public.featured_services
  for select
  to anon, authenticated
  using (is_active);

insert into public.featured_services (title, description, image_url, link_path, display_order, is_active)
select seed.title, seed.description, null, seed.link_path, seed.display_order, true
from (values
  ('Police Character Certificate', 'Support with applying for and collecting your Nigerian police character certificate for travel and immigration use.', '/services/police-character-certificate', 1),
  ('Proof of Funds', 'Guidance on preparing the financial documents embassies expect to see with your application.', '/services/proof-of-funds', 2),
  ('Visa Applications', 'Destination-specific visa guidance, document checklists and application review by real specialists.', '/services/visa-assistance', 3),
  ('Flight Booking', 'Search live routes and fares, then let our team handle the booking and ticketing details.', '/flights', 4),
  ('Hotels', 'Find and reserve verified stays worldwide, with confirmations suitable for visa applications.', '/hotels', 5)
) as seed(title, description, link_path, display_order)
where not exists (select 1 from public.featured_services);
