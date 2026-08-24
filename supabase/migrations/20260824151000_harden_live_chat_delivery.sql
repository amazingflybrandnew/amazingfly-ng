alter table public.customer_messages
  add column if not exists client_message_id uuid;

create unique index if not exists customer_messages_client_message_idx
  on public.customer_messages (client_message_id);

create index if not exists customer_messages_user_created_idx
  on public.customer_messages (user_id, created_at);

create index if not exists customer_messages_admin_idx
  on public.customer_messages (admin_id);

comment on column public.customer_messages.client_message_id is
  'Client-generated idempotency key that prevents duplicate chat messages after retries.';
