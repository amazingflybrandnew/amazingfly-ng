alter table public.service_requests add column if not exists flight_add_ons jsonb not null default '[]'::jsonb;

alter table public.service_requests add constraint service_requests_flight_add_ons_array check (jsonb_typeof(flight_add_ons) = 'array');

comment on column public.service_requests.flight_add_ons is 'Customer-selected Amazingfly add-ons for flight requests only; ignored for all other service categories.';
