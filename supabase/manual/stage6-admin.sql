-- ============================================================================
-- Amazingfly Travels — Stage 5 / Admin Part 2
-- Customers, services, website content, communication, activity tracking.
-- Safe to re-run.
-- ============================================================================

-- 1. ADMIN ACTIVITY LOG -------------------------------------------------------
create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_profiles(id) on delete set null,
  admin_name text not null default 'Amazingfly staff',
  action text not null,
  entity_type text not null default 'request',
  entity_id uuid,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_log_created_idx
  on public.admin_activity_log (created_at desc);

grant select on public.admin_activity_log to authenticated;
grant all on public.admin_activity_log to service_role;
alter table public.admin_activity_log enable row level security;

drop policy if exists "Admins read activity log" on public.admin_activity_log;
create policy "Admins read activity log" on public.admin_activity_log
  for select to authenticated using (public.is_admin(auth.uid()));

-- 2. CUSTOMER MESSAGES --------------------------------------------------------
create table if not exists public.customer_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  sender text not null default 'customer',
  admin_id uuid references public.admin_profiles(id) on delete set null,
  author_name text,
  body text not null,
  read_by_admin boolean not null default false,
  read_by_customer boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.customer_messages drop constraint if exists customer_messages_sender_check;
alter table public.customer_messages add constraint customer_messages_sender_check
  check (sender in ('admin','customer'));

create index if not exists customer_messages_email_idx on public.customer_messages (lower(email), created_at);
create index if not exists customer_messages_request_idx on public.customer_messages (request_id, created_at);

grant select, insert on public.customer_messages to authenticated;
grant all on public.customer_messages to service_role;
alter table public.customer_messages enable row level security;

drop policy if exists "Customers read own messages" on public.customer_messages;
create policy "Customers read own messages" on public.customer_messages
  for select to authenticated
  using (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));

drop policy if exists "Customers write own messages" on public.customer_messages;
create policy "Customers write own messages" on public.customer_messages
  for insert to authenticated
  with check (
    sender = 'customer'
    and (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email','')))
  );

drop policy if exists "Admins read all messages" on public.customer_messages;
create policy "Admins read all messages" on public.customer_messages
  for select to authenticated using (public.is_admin(auth.uid()));

-- Notify the customer when staff send a message.
create or replace function public.notify_customer_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare reference text;
begin
  if new.sender = 'admin' and new.user_id is not null then
    select sr.request_reference into reference
    from public.service_requests sr where sr.id = new.request_id;
    insert into public.notifications (user_id, request_id, title, message, read_status)
    values (
      new.user_id,
      new.request_id,
      'New message from Amazingfly Travels',
      case when reference is null
        then left(new.body, 200)
        else 'Regarding ' || reference || ': ' || left(new.body, 180) end,
      false
    );
  end if;
  return new;
end; $$;

drop trigger if exists customer_messages_notify on public.customer_messages;
create trigger customer_messages_notify after insert on public.customer_messages
for each row execute function public.notify_customer_message();

-- 3. SERVICE MANAGEMENT COLUMNS ----------------------------------------------
alter table public.services add column if not exists description text;
alter table public.services add column if not exists image_url text;
alter table public.services add column if not exists category text;

-- 4. WEBSITE CONTENT (CMS) ----------------------------------------------------
create table if not exists public.site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

grant select on public.site_content to anon, authenticated;
grant all on public.site_content to service_role;
alter table public.site_content enable row level security;

drop policy if exists "Public read site content" on public.site_content;
create policy "Public read site content" on public.site_content
  for select to anon, authenticated using (true);

insert into public.site_content (key, value) values
  ('hero_headline', ''),
  ('hero_subheadline', ''),
  ('hero_cta_label', ''),
  ('hero_image_url', ''),
  ('about_heading', ''),
  ('about_body', ''),
  ('why_choose_us', ''),
  ('contact_phone', ''),
  ('contact_whatsapp', ''),
  ('contact_email', ''),
  ('office_address', ''),
  ('business_hours', ''),
  ('facebook_url', ''),
  ('instagram_url', ''),
  ('x_url', '')
on conflict (key) do nothing;

-- 5. TESTIMONIALS -------------------------------------------------------------
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  quote text not null,
  rating int not null default 5,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.testimonials drop constraint if exists testimonials_rating_check;
alter table public.testimonials add constraint testimonials_rating_check check (rating between 1 and 5);

grant select on public.testimonials to anon, authenticated;
grant all on public.testimonials to service_role;
alter table public.testimonials enable row level security;

drop policy if exists "Public read active testimonials" on public.testimonials;
create policy "Public read active testimonials" on public.testimonials
  for select to anon, authenticated using (is_active);

-- 6. WEBSITE MEDIA BUCKET -----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read site media" on storage.objects;
create policy "Public read site media" on storage.objects
  for select to anon, authenticated using (bucket_id = 'site-media');
