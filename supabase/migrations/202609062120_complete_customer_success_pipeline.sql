-- Complete the customer-success publishing pipeline with least-privilege access.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-successes',
  'customer-successes',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can manage customer successes"
  on public.customer_successes;
drop policy if exists "Public can view active customer successes"
  on public.customer_successes;

create policy "Public can view active customer successes"
on public.customer_successes
for select
to anon, authenticated
using (is_active = true);

create policy "Admins can insert customer successes"
on public.customer_successes
for insert
to authenticated
with check (public.is_admin((select auth.uid())));

create policy "Admins can update customer successes"
on public.customer_successes
for update
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

create policy "Admins can delete customer successes"
on public.customer_successes
for delete
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Public can view customer success images"
  on storage.objects;
drop policy if exists "Admins can upload customer success images"
  on storage.objects;
drop policy if exists "Admins can update customer success images"
  on storage.objects;
drop policy if exists "Admins can delete customer success images"
  on storage.objects;

create policy "Public can view customer success images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'customer-successes');

create policy "Admins can upload customer success images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'customer-successes'
  and public.is_admin((select auth.uid()))
);

create policy "Admins can update customer success images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'customer-successes'
  and public.is_admin((select auth.uid()))
)
with check (
  bucket_id = 'customer-successes'
  and public.is_admin((select auth.uid()))
);

create policy "Admins can delete customer success images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'customer-successes'
  and public.is_admin((select auth.uid()))
);