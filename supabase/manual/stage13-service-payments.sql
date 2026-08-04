-- ==========================================================================
-- Amazingfly Travels — Stage 13: universal service payments & quotations
-- Safe to run more than once.
-- ==========================================================================

-- 1. Payment + quotation columns on service_requests -----------------------
alter table public.service_requests
  add column if not exists paid_at timestamptz,
  add column if not exists quote_notes text,
  add column if not exists quoted_at timestamptz,
  add column if not exists quoted_by uuid,
  add column if not exists quoted_amount numeric(12, 2),
  add column if not exists amount numeric(12, 2),
  add column if not exists currency text default 'NGN',
  add column if not exists requires_quote boolean not null default false,
  add column if not exists catalogue_id text;

-- 2. Helpful indexes for the dashboards ------------------------------------
create index if not exists service_requests_payment_status_idx
  on public.service_requests (payment_status);
create index if not exists service_requests_requires_quote_idx
  on public.service_requests (requires_quote);
create index if not exists payment_transactions_request_idx
  on public.payment_transactions (request_id, created_at desc);

-- 3. Grants (Data API access) ----------------------------------------------
grant select, insert, update, delete on public.service_requests to authenticated;
grant all on public.service_requests to service_role;
grant select, insert, update on public.payment_transactions to authenticated;
grant all on public.payment_transactions to service_role;
