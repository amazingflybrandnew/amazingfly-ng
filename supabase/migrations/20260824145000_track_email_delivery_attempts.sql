alter table public.email_notifications
  add column if not exists provider_message_id text,
  add column if not exists error_message text,
  add column if not exists attempt_count integer not null default 1,
  add column if not exists last_attempt_at timestamptz not null default now();

comment on column public.email_notifications.provider_message_id is
  'Transactional email provider message identifier when accepted.';
comment on column public.email_notifications.error_message is
  'Sanitized provider or configuration error for failed delivery.';
comment on column public.email_notifications.attempt_count is
  'Number of provider attempts made during this delivery operation.';
comment on column public.email_notifications.last_attempt_at is
  'Timestamp of the final delivery attempt.';
