-- Reusable updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. services
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text NOT NULL,
  cta_label text NOT NULL,
  price_label text,
  starting_fee numeric(12,2),
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  fulfillment_mode text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT services_fulfillment_mode_check CHECK (fulfillment_mode IN ('manual','automated','hybrid'))
);

GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active services are publicly readable"
ON public.services FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE TRIGGER services_set_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.services (name, slug, short_description, cta_label, price_label, active, display_order, fulfillment_mode) VALUES
('Visa Assistance','visa-assistance','Destination-specific guidance, document checklists and application review handled by real people.','Start a Request','Contact for pricing',true,1,'manual'),
('Flights','flights','Send us your route and dates and receive a quotation prepared by the Amazingfly Travels team.','Request a Quote','Request a quote',true,2,'manual'),
('Hotels','hotels','Share your destination and stay dates and receive a hotel quotation from our team.','Request a Quote','Request a quote',true,3,'manual'),
('Travel Insurance','travel-insurance','Guidance on travel insurance suited to your trip, with cover and pricing confirmed after your request.','Start a Request','Contact for pricing',true,4,'manual'),
('Proof of Funds Guidance','proof-of-funds','Guidance on organising and presenting genuine, verifiable financial documentation.','Start a Request','Contact for pricing',true,5,'manual'),
('Police Character Certificate','police-character-certificate','Assistance with understanding and completing the police character certificate process.','Start a Request','Contact for pricing',true,6,'manual'),
('Yellow Fever Card Assistance','yellow-fever-card','Assistance with the yellow fever vaccination card process required by many destinations.','Start a Request','Contact for pricing',true,7,'manual');

-- 2. site_settings
CREATE TABLE public.site_settings (
  id smallint PRIMARY KEY,
  business_name text NOT NULL DEFAULT 'Amazingfly Travels',
  platform_name text NOT NULL DEFAULT 'Amazingfly.ng',
  phone text,
  whatsapp text,
  email text,
  office_address text,
  business_hours text,
  facebook_url text,
  instagram_url text,
  x_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton_check CHECK (id = 1)
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are publicly readable"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE TRIGGER site_settings_set_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (id, business_name, platform_name)
VALUES (1, 'Amazingfly Travels', 'Amazingfly.ng');

-- 3. service_requests
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_reference text NOT NULL UNIQUE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  whatsapp text,
  destination text,
  travel_date date,
  request_details text NOT NULL,
  preferred_contact text NOT NULL DEFAULT 'whatsapp',
  consent_to_contact boolean NOT NULL,
  request_status text NOT NULL DEFAULT 'new',
  payment_status text NOT NULL DEFAULT 'unpaid',
  agreed_fee numeric(12,2),
  staff_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_requests_status_check CHECK (request_status IN ('new','contacted','awaiting_information','quotation_sent','processing','completed','cancelled')),
  CONSTRAINT service_requests_payment_status_check CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded')),
  CONSTRAINT service_requests_preferred_contact_check CHECK (preferred_contact IN ('whatsapp','phone','email')),
  CONSTRAINT service_requests_reference_format_check CHECK (request_reference ~ '^AF-[0-9]{8}-[A-Z0-9]{6}$')
);

CREATE INDEX service_requests_service_id_idx ON public.service_requests(service_id);

-- Column-scoped insert only; no select/update/delete for public roles
GRANT INSERT (
  request_reference, service_id, full_name, email, phone, whatsapp,
  destination, travel_date, request_details, preferred_contact, consent_to_contact
) ON public.service_requests TO anon, authenticated;
GRANT ALL ON public.service_requests TO service_role;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visitors may submit a request with consent"
ON public.service_requests FOR INSERT
TO anon, authenticated
WITH CHECK (
  consent_to_contact = true
  AND request_reference ~ '^AF-[0-9]{8}-[A-Z0-9]{6}$'
  AND EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_requests.service_id AND s.active = true
  )
);

CREATE TRIGGER service_requests_set_updated_at
BEFORE UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();