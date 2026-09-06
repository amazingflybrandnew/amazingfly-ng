-- Restrict customer-success publishing to verified administrators.

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