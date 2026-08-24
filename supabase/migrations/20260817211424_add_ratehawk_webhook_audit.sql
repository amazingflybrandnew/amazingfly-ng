-- Exact repository copy of the migration already applied in Supabase.
-- Do not modify while RateHawk/ETG certification is under review.
create table if not exists public.ratehawk_webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  partner_order_id text not null,
  order_id text null,
  provider_status text null,
  signature_verified boolean not null default true,
  processed boolean not null default false,
  processing_error text null
);

create index if not exists ratehawk_webhook_events_partner_order_idx
  on public.ratehawk_webhook_events (partner_order_id, received_at desc);

alter table public.ratehawk_webhook_events enable row level security;

comment on table public.ratehawk_webhook_events is 'Server-side audit receipts for signature-verified RateHawk/ETG booking-status webhooks. No card data or API secrets are stored.';
