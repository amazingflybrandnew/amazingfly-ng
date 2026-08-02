# Amazingfly.ng — Owner's Manual Guide

This guide explains how you (the owner of Amazingfly Travels) manage the website data
by hand. No passwords, keys or private credentials are stored in this file.

Everything below happens in the **Table Editor** of your Lovable Cloud backend
(open your project, then **Cloud → Database / Table Editor**).

---

## A. Customer requests (`service_requests`)

1. **Open the Table Editor.** In your project, open the Cloud/Backend section and
   choose the Table Editor.
2. **Open `service_requests`.** Select it in the list of tables on the left.
   The newest requests are the ones with the most recent `created_at`.
3. **View a customer request.** Click a row to expand it. You will see the
   `request_reference` (for example `AF-20260731-AB12CD`), the service chosen,
   the customer's name, email, phone, WhatsApp, destination, travel date and the
   details they wrote.
4. **Change `request_status`.** Click the `request_status` cell and type one of:
   `received`, `contacted`, `awaiting_information`, `quotation_sent`,
   `processing`, `completed`, `cancelled`. Press Enter/Save. Never type free
   text or test wording here — see section D.
5. **Change `payment_status`.** Click the `payment_status` cell and type one of:
   `unpaid`, `pending`, `paid`, `failed`, `refunded`. Press Enter/Save.
6. **Add `agreed_fee`.** Click the `agreed_fee` cell and type the agreed amount
   as a number, for example `75000.00`. Leave it empty until a fee is agreed.
7. **Add `staff_notes`.** Click the `staff_notes` cell and type your internal
   notes. Customers never see this field.

> Customers cannot read, change or delete requests. Only you, in the Table
> Editor, can view and edit them.

---

## B. Services shown on the website (`services`)

8. **Open `services`.** Select it in the table list. There are seven rows, one
   per service.
9. **Change a service description.** Edit the `short_description` cell. This is
   the operational summary used by the request system.
10. **Change button wording.** Edit the `cta_label` cell, for example from
    `Start a Request` to `Request a Quote`.
11. **Change price labels.** Edit the `price_label` cell, for example
    `Contact for pricing` or `From ₦50,000`. You may also set a number in
    `starting_fee` if you want to record an actual starting amount.
12. **Activate or deactivate a service.** Toggle the `active` cell.
    `true` = visible and selectable on the request form.
    `false` = hidden from the public site and from the request form.
13. **Change service display order.** Edit the `display_order` cell. Lower
    numbers appear first (1, 2, 3 …).

---

## C. Business information (`site_settings`)

14. **Open `site_settings`.** There is exactly one row, with `id = 1`.
15. **Enter your real contact information.** Fill in:
    - `phone` — your business phone number
    - `whatsapp` — your WhatsApp number
    - `email` — your business email address
    - `office_address` — your office address
    - `business_hours` — for example `Monday – Friday, 9am – 5pm`
    - `facebook_url`, `instagram_url`, `x_url` — your social media links

    `business_name` should stay **Amazingfly Travels** and `platform_name`
    should stay **Amazingfly.ng**.

---

## D. Keeping `request_status` clean

The website never writes `request_status` (or `payment_status`, `agreed_fee`,
`staff_notes`). New requests only carry the customer's own details, so the
status always comes from the database default — placeholder or test text such
as "Connection Check" can only get there by being typed in by hand in the
Table Editor.

The valid statuses are set by **Stage 3** (see Section E — run
`supabase/manual/stage3.sql`):

`new_request`, `under_review`, `documents_required`, `processing`,
`approved`, `completed`, `cancelled`

Do **not** run the older Stage-2 status SQL (`received`, `contacted`, …). Your
rows already use the Stage-3 values, so that constraint fails with
`23514 ... is violated by some row`. Stage 3's script is the only one to run,
and it is safe to re-run.


---

## Notes

- Only one settings record is allowed (`id = 1`).
- Deleting a service that already has requests attached is blocked; deactivate
  it instead by setting `active` to `false`.
- The website keeps its detailed service pages in the code, so the public pages
  stay online even if the database is briefly unreachable. In that case the
  request page shows a "contact support" message instead of the form.
- Never share passwords, API keys or private credentials — they are not needed
  for any step in this guide.

---

## Section E — Stage 3: Travel Request System

Stage 3 adds the multi-step request journey, secure document upload, customer
records and request tracking. Lovable cannot run DDL against the external
project (`etfvjtyrsmcsawsdxqgq`), so **run `supabase/manual/stage3.sql` once in
the Supabase SQL Editor**. It is idempotent and safe to re-run.

What it does:

1. Creates `public.customers` (one row per customer email).
2. Adds travel/passport/workflow columns to `public.service_requests`
   (`customer_id`, `service_type`, `origin_country`, `destination_country`,
   `travel_purpose`, `return_date`, `traveller_count`, passport fields,
   `assigned_staff`).
3. Normalises `request_status` to the workflow values
   `new_request`, `under_review`, `documents_required`, `processing`,
   `approved`, `completed`, `cancelled` (default `new_request`, enforced by a
   check constraint so free text such as "Connection Check" is rejected).
4. Creates `public.uploaded_documents` linked to `service_requests`.

Storage: the private bucket **`request-documents`** already exists. The browser
never holds Supabase credentials — the server issues a short-lived signed
upload URL per file, so no `storage.objects` policies for `anon` are required.

Security model: `customers` and `uploaded_documents` have RLS enabled with **no
anon policies**. Only the server (service role) reads/writes them. The website
still cannot set `request_status`, `payment_status`, `agreed_fee` or
`staff_notes` — those stay staff-controlled for the admin dashboard stage.

Email notifications: message composition lives in `src/lib/notifications.server.ts`
(customer receipt, admin alert, status update). Delivery is logged until an
Amazingfly.ng sender domain is verified; wiring the sender is a one-line change
in `deliver()`.

## Stage 3.1 — Dynamic service-specific request system

Run `supabase/manual/stage3-dynamic.sql` in the Supabase SQL Editor (after `stage3.sql`).

It adds:
- `service_categories`, `service_questions`, `service_documents` (flexible form definition tables, public read-only, RLS on)
- `service_requests.service_category` (text) and `service_requests.answers` (jsonb) so every service-specific answer is stored dynamically
- Seeds the 7 categories used by the website (visa, flight, hotel, documents, insurance, airport_transfer, other)

Until this SQL is run, submissions still succeed — the server falls back to
inserting without the new columns and folds all answers into `request_details`.

## Stage 5 — Admin Part 2 (customers, services, content, messages, activity)

Run `supabase/manual/stage6-admin.sql` in the Supabase SQL editor. It is safe to
re-run and creates:

- `admin_activity_log` — audit trail of every staff action
- `customer_messages` — two-way conversation between staff and customers (auto-notifies the customer)
- `site_content` + `testimonials` — website content managed from `/admin/content`
- `services.description`, `services.image_url`, `services.category`
- the public `site-media` storage bucket for website imagery

## Stage 6 Part 1 — CMS

Run `supabase/manual/stage6-cms.sql` in the Supabase SQL editor for project
`etfvjtyrsmcsawsdxqgq`. It creates/updates:

- `site_content` (hero keys: badge, headline, rotating words, description, CTA, images)
- `destinations` (country, title, description, image_url, services[], status)
- `service_content` (service_id, title, description, requirements, image_url)
- `testimonials` (adds `country` and `image_url`)
- `site-media` storage bucket with folders `website/hero`, `website/services`,
  `website/destinations`, `website/testimonials`

Admin pages: `/admin/content`, `/admin/services-content`, `/admin/destinations`,
`/admin/testimonials`.
