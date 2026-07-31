REVOKE ALL ON public.service_requests FROM anon, authenticated;

GRANT INSERT (
  request_reference, service_id, full_name, email, phone, whatsapp,
  destination, travel_date, request_details, preferred_contact, consent_to_contact
) ON public.service_requests TO anon, authenticated;

REVOKE ALL ON public.services FROM anon, authenticated;
GRANT SELECT ON public.services TO anon, authenticated;

REVOKE ALL ON public.site_settings FROM anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;