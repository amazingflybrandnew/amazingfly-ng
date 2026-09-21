-- Family cover: store all travellers (2 adults + 1-6 children) for a booking.
-- The single `traveller` column is kept for individual cover and dashboard
-- display (it holds the lead traveller).
alter table public.travel_insurance_quotes
  add column if not exists travellers jsonb;
