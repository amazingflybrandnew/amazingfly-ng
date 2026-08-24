-- Exact repository copy of the migration already applied in Supabase.
-- Do not modify while RateHawk/ETG certification is under review.
create table if not exists public.ratehawk_webhook_ingress (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  method text not null default 'POST',
  payload_parseable boolean not null default false,
  signature_present boolean not null default false,
  signature_verified boolean null,
  partner_order_id text null,
  order_id text null,
  outcome text not null default 'received'
);

create index if not exists ratehawk_webhook_ingress_received_idx
  on public.ratehawk_webhook_ingress (received_at desc);

create index if not exists ratehawk_webhook_ingress_partner_idx
  on public.ratehawk_webhook_ingress (partner_order_id, received_at desc);

alter table public.ratehawk_webhook_ingress enable row level security;

comment on table public.ratehawk_webhook_ingress is 'Minimal server-side ingress diagnostics for RateHawk/ETG webhooks. Stores no API token, signature value, card data, or customer PII.';
