-- Broadcast expense INSERT/UPDATE/DELETE through Supabase Realtime.
-- RLS remains enabled; subscriptions are scoped to household_id in the mobile client.
alter publication supabase_realtime add table public.expenses;
