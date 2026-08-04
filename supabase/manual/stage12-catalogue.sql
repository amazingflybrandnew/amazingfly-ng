-- ============================================================================
-- STAGE 12 — Universal service catalogue, payable service requests
-- Amazingfly Travels (Amazingfly.ng)
-- Safe to re-run.
-- ============================================================================

-- 1. Service catalogue ------------------------------------------------------
create table if not exists public.service_catalogue (
  id text primary key,
  category text not null,
  country text not null,
  flag text,
  name text not null,
  service_type text not null,
  price numeric(14,2) not null default 0,
  currency text not null default 'NGN',
  price_from boolean not null default false,
  processing_time text,
  validity text,
  requirements text[] not null default '{}',
  optional_documents text[] not null default '{}',
  includes text[] not null default '{}',
  requires_quote boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.service_catalogue to anon, authenticated;
grant all on public.service_catalogue to service_role;

alter table public.service_catalogue enable row level security;

drop policy if exists "Public can read active catalogue" on public.service_catalogue;
create policy "Public can read active catalogue"
  on public.service_catalogue for select
  to anon, authenticated
  using (active);

-- 2. Seed / refresh the catalogue -------------------------------------------
insert into public.service_catalogue
  (id, category, country, flag, name, service_type, price, currency, price_from,
   processing_time, validity, requirements, optional_documents, includes,
   requires_quote, active)
values
  ('qatar-tourist-package', 'visa', 'Qatar', '🇶🇦', 'Qatar Tourist Package', 'Tourist', 700000, 'NGN', true, '24 hours – 7 days', 'As granted', array['Passport datapage', 'Passport photo'], '{}'::text[], array['Qatar visa', 'Airport transfer', 'Daily buffet breakfast'], false, true),
  ('qatar-residence-2-years', 'visa', 'Qatar', '🇶🇦', 'Qatar 2 Years Residence Visa', 'Visit', 3300000, 'NGN', false, '24 hours – 7 days', '2 years', array['Passport datapage', 'Passport photo'], '{}'::text[], '{}'::text[], false, true),
  ('mexico-sticker-visa', 'visa', 'Mexico', '🇲🇽', 'Mexico Sticker Visa', 'Tourist', 2800000, 'NGN', false, '4 hours after biometrics', '6 months multiple entry', array['Passport datapage', 'Passport photo', '3 months bank statement'], '{}'::text[], '{}'::text[], false, true),
  ('uae-dubai-5-year-multiple', 'visa', 'United Arab Emirates', '🇦🇪', 'Dubai UAE 5 Years Multiple Entry Tourist Visa', 'Tourist', 3800000, 'NGN', false, '7 – 14 days', '5 years', array['Passport datapage', 'Passport photo', '6 months bank statement'], '{}'::text[], '{}'::text[], false, true),
  ('seychelles-visa', 'visa', 'Seychelles', '🇸🇨', 'Seychelles Visa', 'Tourist', 200000, 'NGN', false, '24 hours – 5 days', '30 days', array['Passport datapage', 'Passport photo', 'Yellow fever card'], '{}'::text[], '{}'::text[], false, true),
  ('ethiopia-visa', 'visa', 'Ethiopia', '🇪🇹', 'Ethiopia Visa', 'Tourist', 250000, 'NGN', false, '24 hours – 5 days', '30 days', array['Passport datapage', 'Passport photo', 'Yellow fever card'], '{}'::text[], '{}'::text[], false, true),
  ('south-africa-visa', 'visa', 'South Africa', '🇿🇦', 'South Africa Visa', 'Tourist', 1100000, 'NGN', false, '7 – 14 days', '90 days stay', array['Passport datapage', 'Passport photo', 'Yellow fever card'], '{}'::text[], '{}'::text[], false, true),
  ('oman-residence-visa', 'visa', 'Oman', '🇴🇲', 'Oman Residence Visa', 'Visit', 2500000, 'NGN', false, '24 hours – 7 days', '2 years', array['Passport datapage', 'Passport photo'], '{}'::text[], '{}'::text[], false, true),
  ('indonesia-visa', 'visa', 'Indonesia', '🇮🇩', 'Indonesia Visa', 'Tourist', 900000, 'NGN', false, '10 – 14 days', '60 days', array['Passport datapage', 'Passport photo'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('morocco-visa', 'visa', 'Morocco', '🇲🇦', 'Morocco Visa', 'Tourist', 300000, 'NGN', false, '5 – 7 days', '30 days stay', array['Passport datapage', 'Passport photo', 'UK / US / Canada / Schengen visa copy if available'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('uae-non-nigerian', 'visa', 'United Arab Emirates', '🇦🇪', 'UAE Visa — Non-Nigerian Applicants', 'Tourist', 300000, 'NGN', false, '5 – 7 days', '30 days', array['Passport datapage', 'Passport photo'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('east-africa-visa', 'visa', 'East Africa (Uganda, Kenya, Rwanda)', '🇺🇬🇰🇪🇷🇼', 'East Africa Visa', 'Tourist', 330000, 'NGN', false, '24 hours – 7 days', '90 days', array['Passport datapage', 'Passport photo'], '{}'::text[], '{}'::text[], false, true),
  ('uganda-visa', 'visa', 'Uganda', '🇺🇬', 'Uganda Visa', 'Tourist', 180000, 'NGN', false, '24 hours – 7 days', '90 days', array['Passport datapage', 'Passport photo'], '{}'::text[], '{}'::text[], false, true),
  ('kenya-visa', 'visa', 'Kenya', '🇰🇪', 'Kenya Visa', 'Tourist', 150000, 'NGN', false, '24 hours – 7 days', '90 days', array['Passport datapage', 'Passport photo'], '{}'::text[], '{}'::text[], false, true),
  ('schengen-france-single', 'visa', 'France', null, 'France Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-france-multiple', 'visa', 'France', null, 'France Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-germany-single', 'visa', 'Germany', null, 'Germany Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-germany-multiple', 'visa', 'Germany', null, 'Germany Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-italy-single', 'visa', 'Italy', null, 'Italy Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-italy-multiple', 'visa', 'Italy', null, 'Italy Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-spain-single', 'visa', 'Spain', null, 'Spain Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-spain-multiple', 'visa', 'Spain', null, 'Spain Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-netherlands-single', 'visa', 'Netherlands', null, 'Netherlands Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-netherlands-multiple', 'visa', 'Netherlands', null, 'Netherlands Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-belgium-single', 'visa', 'Belgium', null, 'Belgium Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-belgium-multiple', 'visa', 'Belgium', null, 'Belgium Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-austria-single', 'visa', 'Austria', null, 'Austria Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-austria-multiple', 'visa', 'Austria', null, 'Austria Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-switzerland-single', 'visa', 'Switzerland', null, 'Switzerland Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-switzerland-multiple', 'visa', 'Switzerland', null, 'Switzerland Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-sweden-single', 'visa', 'Sweden', null, 'Sweden Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-sweden-multiple', 'visa', 'Sweden', null, 'Sweden Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-norway-single', 'visa', 'Norway', null, 'Norway Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-norway-multiple', 'visa', 'Norway', null, 'Norway Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-denmark-single', 'visa', 'Denmark', null, 'Denmark Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-denmark-multiple', 'visa', 'Denmark', null, 'Denmark Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-finland-single', 'visa', 'Finland', null, 'Finland Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-finland-multiple', 'visa', 'Finland', null, 'Finland Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-greece-single', 'visa', 'Greece', null, 'Greece Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-greece-multiple', 'visa', 'Greece', null, 'Greece Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-portugal-single', 'visa', 'Portugal', null, 'Portugal Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-portugal-multiple', 'visa', 'Portugal', null, 'Portugal Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-poland-single', 'visa', 'Poland', null, 'Poland Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-poland-multiple', 'visa', 'Poland', null, 'Poland Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-czech-republic-single', 'visa', 'Czech Republic', null, 'Czech Republic Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-czech-republic-multiple', 'visa', 'Czech Republic', null, 'Czech Republic Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-hungary-single', 'visa', 'Hungary', null, 'Hungary Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-hungary-multiple', 'visa', 'Hungary', null, 'Hungary Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-croatia-single', 'visa', 'Croatia', null, 'Croatia Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-croatia-multiple', 'visa', 'Croatia', null, 'Croatia Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-slovenia-single', 'visa', 'Slovenia', null, 'Slovenia Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-slovenia-multiple', 'visa', 'Slovenia', null, 'Slovenia Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-slovakia-single', 'visa', 'Slovakia', null, 'Slovakia Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-slovakia-multiple', 'visa', 'Slovakia', null, 'Slovakia Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-estonia-single', 'visa', 'Estonia', null, 'Estonia Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-estonia-multiple', 'visa', 'Estonia', null, 'Estonia Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-latvia-single', 'visa', 'Latvia', null, 'Latvia Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-latvia-multiple', 'visa', 'Latvia', null, 'Latvia Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-lithuania-single', 'visa', 'Lithuania', null, 'Lithuania Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-lithuania-multiple', 'visa', 'Lithuania', null, 'Lithuania Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-luxembourg-single', 'visa', 'Luxembourg', null, 'Luxembourg Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-luxembourg-multiple', 'visa', 'Luxembourg', null, 'Luxembourg Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-malta-single', 'visa', 'Malta', null, 'Malta Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-malta-multiple', 'visa', 'Malta', null, 'Malta Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-iceland-single', 'visa', 'Iceland', null, 'Iceland Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-iceland-multiple', 'visa', 'Iceland', null, 'Iceland Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-liechtenstein-single', 'visa', 'Liechtenstein', null, 'Liechtenstein Schengen Visa — Single Entry', 'Tourist / Visit / Business', 500000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('schengen-liechtenstein-multiple', 'visa', 'Liechtenstein', null, 'Liechtenstein Schengen Visa — Multiple Entry', 'Tourist / Visit / Business', 600000, 'NGN', false, '1 – 2 months', 'As granted by the embassy', array['Passport datapage', 'Passport photo', 'Bank statement', 'Employment or business evidence', 'Travel insurance'], array['Flight itinerary (optional)', 'Hotel itinerary (optional)'], '{}'::text[], false, true),
  ('police-character-certificate', 'document', 'Nigeria', '🇳🇬', 'Police Character Certificate', 'Travel document', 50000, 'NGN', false, 'Maximum 48 hours after capturing', null, array['Passport datapage', 'Passport photo'], '{}'::text[], '{}'::text[], false, true)
on conflict (id) do update set
  category = excluded.category,
  country = excluded.country,
  flag = excluded.flag,
  name = excluded.name,
  service_type = excluded.service_type,
  price = excluded.price,
  currency = excluded.currency,
  price_from = excluded.price_from,
  processing_time = excluded.processing_time,
  validity = excluded.validity,
  requirements = excluded.requirements,
  optional_documents = excluded.optional_documents,
  includes = excluded.includes,
  requires_quote = excluded.requires_quote,
  active = excluded.active,
  updated_at = now();

-- 3. Retire the services that are no longer offered --------------------------
update public.service_catalogue set active = false
 where id in ('passport-assistance', 'invitation-letter', 'itinerary-preparation', 'yellow-fever-card');

update public.services 
set active = false
where slug in ('yellow-fever-card')
and exists (
 select 1 
 from information_schema.columns
 where table_schema = 'public' 
 and table_name = 'services'
 and column_name = 'active'
);
-- 4. Payable service requests -----------------------------------------------
alter table public.service_requests
  add column if not exists catalogue_id text,
  add column if not exists amount numeric(14,2),
  add column if not exists currency text default 'NGN',
  add column if not exists requires_quote boolean not null default false,
  add column if not exists quote_notes text,
  add column if not exists quoted_at timestamptz;

create index if not exists service_requests_catalogue_id_idx
  on public.service_requests (catalogue_id);

-- 5. Document verification ---------------------------------------------------
alter table public.uploaded_documents
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid;
