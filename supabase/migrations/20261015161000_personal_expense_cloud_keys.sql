-- Idempotent migration key for device-local personal expenses.
alter table public.expenses add column if not exists client_key text;
create unique index if not exists expenses_owner_client_key_unique
 on public.expenses(owner_id,client_key) where client_key is not null;
-- Existing personal-expense RLS already restricts reads to owner_id=auth.uid().
