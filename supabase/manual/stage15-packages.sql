-- ============================================================================
-- STAGE 15 — Service package organisation
-- Amazingfly Travels (Amazingfly.ng)
--
-- Non-destructive. No payment table, policy or column is touched.
-- Changes:
--   1. adds a `description` column to public.service_catalogue (customer copy)
--   2. re-labels the legacy 'document' category to the new category keys
--   3. seeds the additional packages used by the new category → destination →
--      package customer flow
-- Safe to re-run.
-- ============================================================================

alter table public.service_catalogue
  add column if not exists description text not null default '';

-- 1. Category keys now match the seven customer-facing categories -------------
update public.service_catalogue
   set category = 'police-character-certificate'
 where id = 'police-character-certificate';

-- 2. Additional packages ------------------------------------------------------
insert into public.service_catalogue
  (id, category, country, flag, name, description, service_type, price, currency,
   price_from, processing_time, validity, requirements, optional_documents,
   includes, requires_quote, active)
values
  ('uae-tourist-30-days', 'visa', 'United Arab Emirates', '🇦🇪',
   'UAE Tourist Visa — 30 Days',
   'Single entry tourist visa for a stay of up to 30 days in the UAE.',
   'Tourist', 300000, 'NGN', false, '5 – 7 working days', '30 days',
   array['Passport datapage', 'Passport photo'], '{}'::text[], '{}'::text[], false, true),

  ('uae-multiple-entry', 'visa', 'United Arab Emirates', '🇦🇪',
   'UAE Multiple Entry Visa',
   'Multiple entry visa for travellers making more than one trip to the UAE.',
   'Tourist', 500000, 'NGN', false, '7 – 10 working days', null,
   array['Passport datapage', 'Passport photo'], '{}'::text[], '{}'::text[], false, true),

  ('proof-of-funds-support', 'proof-of-funds', 'Nigeria', '🇳🇬',
   'Proof of Funds Support',
   'Guidance on the financial evidence your embassy expects, and help assembling it correctly.',
   'Travel document', 0, 'NGN', false, 'Confirmed with your specialist', null,
   array['Passport datapage', 'Passport photo', 'Bank statement'], '{}'::text[], '{}'::text[], true, true),

  ('yellow-fever-card-support', 'yellow-fever-card', 'Nigeria', '🇳🇬',
   'Yellow Fever Card Assistance',
   'Assistance obtaining the yellow fever vaccination card required by many destinations.',
   'Travel document', 0, 'NGN', false, 'Confirmed with your specialist', null,
   array['Passport datapage', 'Passport photo'], '{}'::text[], '{}'::text[], true, true),

  ('travel-insurance-cover', 'travel-insurance', 'Worldwide', null,
   'Travel Medical Insurance',
   'Embassy-accepted travel medical insurance for the length of your trip.',
   'Insurance', 0, 'NGN', false, 'Confirmed with your specialist', null,
   array['Passport datapage', 'Passport photo'], '{}'::text[], '{}'::text[], true, true)

on conflict (id) do update set
  category = excluded.category,
  country = excluded.country,
  flag = excluded.flag,
  name = excluded.name,
  description = excluded.description,
  service_type = excluded.service_type,
  price = excluded.price,
  processing_time = excluded.processing_time,
  validity = excluded.validity,
  requirements = excluded.requirements,
  requires_quote = excluded.requires_quote,
  active = excluded.active,
  updated_at = now();
