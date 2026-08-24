create table if not exists public.travel_insurance_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  flight_booking_id uuid,
  quote_request_id text not null,
  product_variant_id text,
  destination_country text,
  purpose_of_travel text,
  travel_plan_id integer,
  booking_type_id integer,
  cover_start_date date,
  cover_end_date date,
  travellers_count integer default 1,
  amount numeric,
  allianz_price numeric,
  status text default 'quoted',
  created_at timestamptz default now()
);

create table if not exists public.travel_insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  quote_id uuid references public.travel_insurance_quotes(id),
  contract_number text,
  payment_reference text,
  amount_paid numeric,
  policy_status text default 'pending',
  certificate_url text,
  created_at timestamptz default now()
);

alter table public.travel_insurance_quotes enable row level security;
alter table public.travel_insurance_policies enable row level security;
