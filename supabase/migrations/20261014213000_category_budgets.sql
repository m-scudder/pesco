-- Category-specific monthly limits, without partner contribution or settlement data.
create table if not exists public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_name text not null check (length(trim(category_name)) between 1 and 40),
  amount_paise bigint not null check (amount_paise > 0),
  updated_at timestamptz not null default now(),
  unique (household_id, category_name)
);
alter table public.category_budgets enable row level security;
create policy "category_budgets_select" on public.category_budgets for select to authenticated
 using (public.is_household_member(household_id));
create policy "category_budgets_insert" on public.category_budgets for insert to authenticated
 with check (public.is_household_member(household_id));
create policy "category_budgets_update" on public.category_budgets for update to authenticated
 using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "category_budgets_delete" on public.category_budgets for delete to authenticated
 using (public.is_household_member(household_id));
grant select,insert,update,delete on public.category_budgets to authenticated;
