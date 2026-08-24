-- ============================================================================
-- Amazingfly Travels — Stage 6 Part 1: CMS
-- Hero content, service content, destinations, testimonials, website media.
-- Safe to re-run.
-- ============================================================================

-- 1. SITE CONTENT (key/value CMS) --------------------------------------------
create table if not exists public.site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

grant select on public.site_content to anon, authenticated;
grant all on public.site_content to service_role;
alter table public.site_content enable row level security;

drop policy if exists "Public read site content" on public.site_content;
create policy "Public read site content" on public.site_content
  for select to anon, authenticated using (true);

-- Hero + brand keys used by the homepage.
insert into public.site_content (key, value) values
  ('hero_badge', 'Amazingfly.ng · Travel made simple'),
  ('hero_headline', 'A simpler way to'),
  ('hero_rotating_words', E'prepare your visa application\nbook your next flight\nplan your perfect trip\nrequest travel document support'),
  ('hero_description', 'Practical travel planning and human support for Nigerian travellers.'),
  ('hero_cta_label', 'Get Started'),
  ('hero_image_url', ''),
  ('hero_traveller_image_url', ''),
  ('about_heading', ''),
  ('about_body', ''),
  ('why_choose_us', ''),
  ('contact_phone', ''),
  ('contact_whatsapp', ''),
  ('contact_email', ''),
  ('office_address', ''),
  ('business_hours', ''),
  ('facebook_url', ''),
  ('instagram_url', ''),
  ('x_url', '')
on conflict (key) do nothing;

-- 2. DESTINATIONS -------------------------------------------------------------
create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  title text not null default '',
  description text not null default '',
  image_url text,
  services text[] not null default '{}',
  status boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists destinations_order_idx on public.destinations (display_order, country);

grant select on public.destinations to anon, authenticated;
grant all on public.destinations to service_role;
alter table public.destinations enable row level security;

drop policy if exists "Public read active destinations" on public.destinations;
create policy "Public read active destinations" on public.destinations
  for select to anon, authenticated using (status);

-- 3. SERVICE CONTENT ----------------------------------------------------------
create table if not exists public.service_content (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete cascade,
  slug text,
  title text not null default '',
  description text not null default '',
  requirements text not null default '',
  image_url text,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists service_content_service_idx on public.service_content (service_id);

grant select on public.service_content to anon, authenticated;
grant all on public.service_content to service_role;
alter table public.service_content enable row level security;

drop policy if exists "Public read active service content" on public.service_content;
create policy "Public read active service content" on public.service_content
  for select to anon, authenticated using (is_active);

-- 4. TESTIMONIALS -------------------------------------------------------------
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  quote text not null,
  rating int not null default 5,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.testimonials add column if not exists country text;
alter table public.testimonials add column if not exists image_url text;

alter table public.testimonials drop constraint if exists testimonials_rating_check;
alter table public.testimonials add constraint testimonials_rating_check check (rating between 1 and 5);

grant select on public.testimonials to anon, authenticated;
grant all on public.testimonials to service_role;
alter table public.testimonials enable row level security;

drop policy if exists "Public read active testimonials" on public.testimonials;
create policy "Public read active testimonials" on public.testimonials
  for select to anon, authenticated using (is_active);

-- 5. WEBSITE MEDIA STORAGE ----------------------------------------------------
-- Folders used: website/hero, website/services, website/destinations, website/testimonials
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read site media" on storage.objects;
create policy "Public read site media" on storage.objects
  for select to anon, authenticated using (bucket_id = 'site-media');
