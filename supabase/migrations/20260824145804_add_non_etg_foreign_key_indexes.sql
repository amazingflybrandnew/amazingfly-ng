-- Add-only, non-ETG performance indexes.
-- Certification-sensitive booking, hotel, RateHawk/ETG and travel-insurance
-- objects are intentionally excluded.

create index if not exists admin_activity_log_admin_id_idx
  on public.admin_activity_log (admin_id);
create index if not exists internal_notes_admin_id_idx
  on public.internal_notes (admin_id);
create index if not exists notifications_request_id_idx
  on public.notifications (request_id);
create index if not exists payments_customer_id_idx
  on public.payments (customer_id);
create index if not exists payments_user_id_idx
  on public.payments (user_id);
create index if not exists request_updates_created_by_idx
  on public.request_updates (created_by);
