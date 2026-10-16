-- One shared overall monthly budget for each household.
create table if not exists public.household_budgets (
 household_id uuid primary key references public.households(id) on delete cascade,
 amount_paise bigint not null check (amount_paise > 0),
 updated_at timestamptz not null default now()
);
alter table public.household_budgets enable row level security;
create policy "household_budgets_select" on public.household_budgets for select to authenticated using (public.is_household_member(household_id));
create policy "household_budgets_insert" on public.household_budgets for insert to authenticated with check (public.is_household_member(household_id));
create policy "household_budgets_update" on public.household_budgets for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household_budgets_delete" on public.household_budgets for delete to authenticated using (public.is_household_member(household_id));
grant select,insert,update,delete on public.household_budgets to authenticated;
alter publication supabase_realtime add table public.household_budgets;
