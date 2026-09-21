-- Remove duplicate policy rows (keep the earliest per request), then enforce
-- one policy per service_request_id so duplicate issuance can never persist.
delete from public.travel_insurance_policies
where id in (
  select id from (
    select id,
      row_number() over (
        partition by service_request_id order by created_at, id
      ) as rn
    from public.travel_insurance_policies
    where service_request_id is not null
  ) t
  where t.rn > 1
);

create unique index if not exists travel_insurance_policies_service_request_unique
  on public.travel_insurance_policies (service_request_id)
  where service_request_id is not null;
