-- Track which insurer a travel-insurance premium was sourced from when an
-- admin issues a personalised quotation (e.g. AXA Mansard, Allianz). Optional
-- and additive; the quotation flow degrades gracefully if this column is
-- absent, so applying this migration is safe at any time.
alter table public.service_requests
  add column if not exists insurer text;
