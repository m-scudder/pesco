-- Supabase grants EXECUTE to API roles explicitly by default.
-- Restrict definer RPCs and internal trigger functions.
revoke execute on function public.create_household(text) from anon;
revoke execute on function public.is_household_member(uuid) from anon;
revoke execute on function public.guard_expense_identity() from public, anon, authenticated;
revoke execute on function public.guard_budget_identity() from public, anon, authenticated;
-- These two functions intentionally remain callable by authenticated users:
-- is_household_member checks auth.uid() internally; create_household creates
-- a household with the authenticated caller as its sole first member.
