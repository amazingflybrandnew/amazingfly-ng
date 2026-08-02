-- =====================================================================
-- Amazingfly Travels — Stage 6 Part 3: Business Automation System
-- Run this once in the Supabase SQL editor for project etfvjtyrsmcsawsdxqgq.
-- Safe to re-run (idempotent).
-- =====================================================================

-- 1. Audit table for every automated email the platform composes ------
create table if not exists public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  request_id uuid references public.service_requests(id) on delete set null,
  user_id uuid,
  request_reference text,
  delivery_status text not null default 'logged',
  created_at timestamptz not null default now()
);

create index if not exists email_notifications_created_idx
  on public.email_notifications (created_at desc);
create index if not exists email_notifications_request_idx
  on public.email_notifications (request_id);
create index if not exists email_notifications_recipient_idx
  on public.email_notifications (lower(recipient_email));

grant all on public.email_notifications to service_role;

alter table public.email_notifications enable row level security;

-- Server-only table: no anon/authenticated policies on purpose.
-- The app reads and writes it with the service role from server code.

-- 2. Make sure in-app notifications can point at a request ------------
alter table public.notifications
  add column if not exists request_id uuid references public.service_requests(id) on delete cascade;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- 3. Helpful indexes for the analytics dashboard ----------------------
create index if not exists service_requests_created_idx
  on public.service_requests (created_at desc);
create index if not exists service_requests_status_idx
  on public.service_requests (request_status);
create index if not exists service_requests_destination_idx
  on public.service_requests (destination_country);
create index if not exists payments_status_created_idx
  on public.payments (status, created_at desc);

-- 4. Optional: view used for quick revenue checks in the SQL editor ---
create or replace view public.v_monthly_revenue as
select
  date_trunc('month', created_at) as month,
  currency,
  sum(coalesce(amount, 0)) filter (where status = 'payment_received') as revenue,
  count(*) filter (where status = 'payment_received') as payments_received
from public.payments
group by 1, 2
order by 1 desc;

grant select on public.v_monthly_revenue to service_role;
