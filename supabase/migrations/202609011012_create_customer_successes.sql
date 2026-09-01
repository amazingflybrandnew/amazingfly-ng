create table if not exists public.customer_successes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_successes enable row level security;

create policy "Public can view active customer successes"
on public.customer_successes
for select
using (is_active = true);

create policy "Authenticated users can manage customer successes"
on public.customer_successes
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
