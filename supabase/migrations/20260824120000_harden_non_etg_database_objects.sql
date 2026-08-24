-- Harden general reporting and trigger objects without changing any
-- RateHawk/ETG hotel tables, booking functions, webhooks, or policies.

begin;

-- Ensure the reporting view obeys the caller's RLS context and is available
-- only to the server-side service role used by the admin application.
alter view public.v_monthly_revenue set (security_invoker = true);
revoke all on public.v_monthly_revenue from public, anon, authenticated;
grant select on public.v_monthly_revenue to service_role;

-- Prevent object-shadowing through a caller-controlled search path.
alter function public.touch_payment_transactions()
  set search_path = public, pg_temp;

-- These functions are invoked only by database triggers. They must not also
-- be exposed as callable RPC endpoints to anonymous or signed-in clients.
revoke execute on function public.handle_new_user()
  from public, anon, authenticated;
revoke execute on function public.handle_request_status_change()
  from public, anon, authenticated;
revoke execute on function public.notify_customer_message()
  from public, anon, authenticated;
revoke execute on function public.notify_document_request()
  from public, anon, authenticated;
revoke execute on function public.notify_payment_status()
  from public, anon, authenticated;
revoke execute on function public.touch_document_requests()
  from public, anon, authenticated;
revoke execute on function public.touch_payment_transactions()
  from public, anon, authenticated;

-- These two helpers are referenced by authenticated RLS policies. Keep only
-- the permission required for those policies and remove anonymous/public RPC.
revoke execute on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;

revoke execute on function public.has_admin_role(uuid, public.admin_role)
  from public, anon;
grant execute on function public.has_admin_role(uuid, public.admin_role)
  to authenticated;

commit;
