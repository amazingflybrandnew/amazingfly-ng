-- ============================================================================
-- STAGE 16 — Package snapshot on service requests
-- Amazingfly Travels (Amazingfly.ng)
--
-- Non-destructive and safe to re-run.
-- No payment table, policy, column or function is touched.
--
-- What changes:
--   1. service_requests gains `package_name` — the human-readable name of the
--      package the customer picked at submission time. The package id is
--      already stored in `catalogue_id`, the price in `amount`, the currency in
--      `currency`, the destination in `destination_country` and the category in
--      `service_category`, so this is the only missing piece of the snapshot.
-- ============================================================================

alter table public.service_requests
  add column if not exists package_name text;
