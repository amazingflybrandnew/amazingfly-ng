-- Diagnostics + robustness for travel insurance issuance.
-- quote_request: the exact Allianz quote payload, so issuance can re-quote for a
--   fresh QuoteId (quotes can expire / be single-use between payment and issue).
-- last_error: the real provider error when issuance fails, for support triage.
alter table public.travel_insurance_quotes
  add column if not exists quote_request jsonb,
  add column if not exists last_error text;
