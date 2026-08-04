-- ============================================================
-- Amazingfly.ng — Task 3: document verification & management
-- Run this in the Supabase SQL editor of project etfvjtyrsmcsawsdxqgq.
-- Safe to run more than once. No new document storage is introduced:
-- this only extends the existing `uploaded_documents` table.
-- ============================================================

-- 1. Review columns on the existing uploads table
alter table public.uploaded_documents
  add column if not exists review_status text not null default 'pending';

alter table public.uploaded_documents
  add column if not exists review_note text;

alter table public.uploaded_documents
  add column if not exists reviewed_at timestamptz;

alter table public.uploaded_documents
  add column if not exists reviewed_by text;

-- 2. Normalise legacy values onto the four business statuses
update public.uploaded_documents set review_status = 'verified' where review_status = 'approved';
update public.uploaded_documents
  set review_status = 'pending'
  where review_status is null
     or review_status not in ('pending', 'verified', 'rejected', 'replacement_required');

alter table public.uploaded_documents
  drop constraint if exists uploaded_documents_review_status_check;
alter table public.uploaded_documents
  add constraint uploaded_documents_review_status_check
  check (review_status in ('pending', 'verified', 'rejected', 'replacement_required'));

create index if not exists uploaded_documents_review_status_idx
  on public.uploaded_documents (review_status);

-- 3. Allow the same vocabulary on document_requests
alter table public.document_requests
  drop constraint if exists document_requests_uploaded_status_check;
alter table public.document_requests
  add constraint document_requests_uploaded_status_check
  check (uploaded_status in (
    'pending', 'uploaded', 'approved', 'verified', 'rejected', 'replacement_required'
  ));

-- 4. Grants stay as they are (service role writes, customer reads own rows).
grant select on public.uploaded_documents to authenticated;
grant all on public.uploaded_documents to service_role;
