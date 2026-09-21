-- Travel insurance (Sanlam Allianz) quote -> pay -> issue flow.
--
-- The travel_insurance_quotes / travel_insurance_policies tables already exist
-- with RLS ENABLED but NO policies, so nothing could be read back. This
-- migration adds the columns needed to carry a quote and the traveller details
-- through to post-payment policy issuance, links both tables to the existing
-- service_requests row, and adds owner-scoped RLS. All writes happen through the
-- server-side service-role client (which bypasses RLS); these policies only let
-- a signed-in customer read their own rows.

-- 1. Quote: link to the request/payment and hold what issuance needs later.
alter table public.travel_insurance_quotes
  add column if not exists service_request_id uuid,
  add column if not exists allianz_quote_request_id integer,
  add column if not exists allianz_country_id integer,
  add column if not exists currency text not null default 'NGN',
  -- Traveller KYC captured at checkout and replayed to Allianz after payment
  -- (names, title/gender/marital ids, passport, NIN, next of kin, ...).
  -- Server-role writes only; protected by the owner-select policy below.
  add column if not exists traveller jsonb;

create index if not exists travel_insurance_quotes_service_request_id_idx
  on public.travel_insurance_quotes (service_request_id);
create index if not exists travel_insurance_quotes_user_id_idx
  on public.travel_insurance_quotes (user_id);

-- 2. Policy: link to the request and record the issued reference.
alter table public.travel_insurance_policies
  add column if not exists service_request_id uuid,
  add column if not exists policy_reference text,
  add column if not exists currency text not null default 'NGN';

create index if not exists travel_insurance_policies_service_request_id_idx
  on public.travel_insurance_policies (service_request_id);
create index if not exists travel_insurance_policies_user_id_idx
  on public.travel_insurance_policies (user_id);

-- 3. RLS — owners can read their own rows; no client insert/update/delete
--    (issuance runs server-side with the service role, which bypasses RLS).
alter table public.travel_insurance_quotes enable row level security;
alter table public.travel_insurance_policies enable row level security;

drop policy if exists "Owners can view their travel insurance quotes"
  on public.travel_insurance_quotes;
create policy "Owners can view their travel insurance quotes"
  on public.travel_insurance_quotes
  for select
  using (auth.uid() = user_id);

drop policy if exists "Owners can view their travel insurance policies"
  on public.travel_insurance_policies;
create policy "Owners can view their travel insurance policies"
  on public.travel_insurance_policies
  for select
  using (auth.uid() = user_id);
