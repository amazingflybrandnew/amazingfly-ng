-- ============================================================================
-- Amazingfly Travels — Stage 6 Part 2: Payment & Booking Workflow
-- Safe to re-run.
-- ============================================================================

-- 1. PAYMENT STATUS ON SERVICE REQUESTS ---------------------------------------
alter table public.service_requests add column if not exists payment_status text;
alter table public.service_requests add column if not exists agreed_fee numeric(12,2);

-- Drop the old constraint before normalising legacy values.
alter table public.service_requests
  drop constraint if exists service_requests_payment_status_check;

update public.service_requests set payment_status = case
  when payment_status in ('unpaid','pending','') or payment_status is null then 'pending_payment'
  when payment_status = 'paid' then 'payment_received'
  when payment_status = 'failed' then 'payment_failed'
  when payment_status = 'refunded' then 'refund_completed'
  when payment_status in ('pending_payment','payment_received','payment_failed',
                          'refund_requested','refund_completed') then payment_status
  else 'pending_payment'
end;

alter table public.service_requests
  alter column payment_status set default 'pending_payment';

alter table public.service_requests
  add constraint service_requests_payment_status_check
  check (payment_status in (
    'pending_payment','payment_received','payment_failed',
    'refund_requested','refund_completed'
  ));

-- 2. PAYMENTS TABLE -----------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  email text not null default '',
  amount numeric(12,2) not null default 0,
  currency text not null default 'NGN',
  payment_provider text not null default 'offline',
  transaction_reference text not null unique,
  status text not null default 'pending_payment',
  created_at timestamptz not null default now()
);

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in (
    'pending_payment','payment_received','payment_failed',
    'refund_requested','refund_completed'
  ));

alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments add constraint payments_provider_check
  check (payment_provider in ('paystack','flutterwave','offline'));

create index if not exists payments_request_idx on public.payments (request_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status, created_at desc);
create index if not exists payments_email_idx on public.payments (lower(email));

-- 3. GRANTS + RLS -------------------------------------------------------------
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;

drop policy if exists "Customers read own payments" on public.payments;
create policy "Customers read own payments" on public.payments
  for select to authenticated
  using (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
  );

drop policy if exists "Admins read all payments" on public.payments;
create policy "Admins read all payments" on public.payments
  for select to authenticated using (public.is_admin(auth.uid()));

-- Writes only happen through the server (service role), never from the browser.

-- 4. NOTIFY THE CUSTOMER WHEN A PAYMENT IS RECEIVED ---------------------------
create or replace function public.notify_payment_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare reference text;
begin
  if new.status is distinct from old.status and new.user_id is not null then
    select sr.request_reference into reference
    from public.service_requests sr where sr.id = new.request_id;
    insert into public.notifications (user_id, request_id, title, message, read_status)
    values (
      new.user_id,
      new.request_id,
      case new.status
        when 'payment_received' then 'Payment received'
        when 'payment_failed' then 'Payment failed'
        when 'refund_requested' then 'Refund requested'
        when 'refund_completed' then 'Refund completed'
        else 'Payment update'
      end,
      coalesce('Regarding ' || reference || ': ', '') ||
      'your payment ' || new.transaction_reference || ' is now ' ||
      replace(new.status, '_', ' ') || '.',
      false
    );
  end if;
  return new;
end; $$;

drop trigger if exists payments_notify on public.payments;
create trigger payments_notify after update on public.payments
for each row execute function public.notify_payment_status();
