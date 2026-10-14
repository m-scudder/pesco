-- Keep the public anon role away from household financial data.
-- Supabase anonymous-auth sessions use the authenticated role after sign-in.
revoke all privileges on table public.expenses from anon;
revoke all privileges on table public.categories from anon;
revoke all privileges on table public.category_budgets from anon;
revoke all privileges on table public.households from anon;
revoke all privileges on table public.household_members from anon;
revoke all privileges on table public.household_recurring_rules from anon;
revoke all privileges on table public.household_recurring_occurrences from anon;
