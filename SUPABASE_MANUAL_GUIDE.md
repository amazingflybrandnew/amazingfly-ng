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
   `new`, `contacted`, `awaiting_information`, `quotation_sent`, `processing`,
   `completed`, `cancelled`. Press Enter/Save.
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

Right now the `service_requests` table in your project has **no
`request_status` column**. To add it with a default and a rule that blocks
invalid text, open **SQL Editor** in Supabase and run:

```sql
alter table public.service_requests
  add column if not exists request_status text not null default 'received';

alter table public.service_requests
  drop constraint if exists service_requests_request_status_check;

alter table public.service_requests
  add constraint service_requests_request_status_check
  check (request_status in (
    'received', 'contacted', 'awaiting_information',
    'quotation_sent', 'processing', 'completed', 'cancelled'
  ));
```

After that, any attempt to save free text like `Connection Check` into
`request_status` is rejected by the database.

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
