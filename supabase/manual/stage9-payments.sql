-- ============================================================================
-- Amazingfly Travels — Stage 9 Part 1: Payment System Foundation
-- Run in the Supabase SQL editor for project etfvjtyrsmcsawsdxqgq.
-- Safe to re-run. No existing table is dropped or duplicated.
-- ============================================================================

-- 1. PAYMENT TRANSACTIONS -----------------------------------------------------
-- One row per payment attempt. Always linked to an EXISTING service_requests
-- row, so flight, hotel, visa and other travel requests all share one flow.
create table if not exists public.payment_transactions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete set null,
  request_id            uuid references public.service_requests(id) on delete cascade,
  transaction_reference text not null unique,
  provider              text not null default 'manual',
  payment_type          text not null default 'travel_service',
  amount                numeric(12,2) not null default 0,
  currency              text not null default 'NGN',
  status                text not null default 'pending',
  payment_method        text,
  provider_response     jsonb,
  paid_at               timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.payment_transactions
  add column if not exists payment_type text not null default 'travel_service';

alter table public.payment_transactions drop constraint if exists payment_transactions_status_check;
alter table public.payment_transactions add constraint payment_transactions_status_check
  check (status in ('pending','successful','failed','cancelled'));

alter table public.payment_transactions drop constraint if exists payment_transactions_provider_check;
alter table public.payment_transactions add constraint payment_transactions_provider_check
  check (provider in ('paystack','flutterwave','manual'));

alter table public.payment_transactions drop constraint if exists payment_transactions_type_check;
alter table public.payment_transactions add constraint payment_transactions_type_check
  check (payment_type in ('flight_booking','hotel_booking','visa_service','travel_service'));

create index if not exists payment_transactions_user_idx
  on public.payment_transactions (user_id, created_at desc);
create index if not exists payment_transactions_request_idx
  on public.payment_transactions (request_id, created_at desc);
create index if not exists payment_transactions_status_idx
  on public.payment_transactions (status, created_at desc);

-- 2. UPDATED_AT TRIGGER -------------------------------------------------------
create or replace function public.touch_payment_transactions()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists payment_transactions_touch on public.payment_transactions;
create trigger payment_transactions_touch before update on public.payment_transactions
for each row execute function public.touch_payment_transactions();

-- 3. GRANTS + RLS -------------------------------------------------------------
-- Customers may only READ their own rows. Every write happens server-side with
-- the service role, so no insert/update/delete grant is given to authenticated.
grant select on public.payment_transactions to authenticated;
grant all on public.payment_transactions to service_role;

alter table public.payment_transactions enable row level security;

drop policy if exists "Customers read own payment transactions" on public.payment_transactions;
create policy "Customers read own payment transactions" on public.payment_transactions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins read all payment transactions" on public.payment_transactions;
create policy "Admins read all payment transactions" on public.payment_transactions
  for select to authenticated
  using (public.is_admin(auth.uid()));
