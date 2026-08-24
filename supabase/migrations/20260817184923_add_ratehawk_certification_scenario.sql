-- Exact repository copy of the migration already applied in Supabase.
-- Do not modify while RateHawk/ETG certification is under review.
alter table public.service_requests add column if not exists hotel_certification_scenario text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_requests_ratehawk_certification_scenario_check'
  ) then
    alter table public.service_requests
      add constraint service_requests_ratehawk_certification_scenario_check
      check (
        hotel_certification_scenario is null or
        hotel_certification_scenario in ('unknown_success','unknown_soldout','unknown_book_limit')
      );
  end if;
end $$;
