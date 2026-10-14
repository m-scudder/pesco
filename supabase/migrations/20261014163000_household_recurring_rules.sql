-- Shared monthly rules and idempotent generated occurrences.
create table if not exists public.household_recurring_rules(
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 amount_paise bigint not null check(amount_paise>0),
 category text not null check(char_length(trim(category)) between 1 and 80),
 note text not null default '' check(char_length(note)<=500),
 day_of_month integer not null check(day_of_month between 1 and 31),
 starts_on date not null,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.household_recurring_occurrences(
 rule_id uuid not null references public.household_recurring_rules(id) on delete cascade,
 occurrence_date date not null,
 expense_id uuid references public.expenses(id) on delete set null,
 primary key(rule_id,occurrence_date), unique(expense_id)
);
create unique index if not exists household_recurring_one_per_month
 on public.household_recurring_occurrences(rule_id,(date_trunc('month',occurrence_date::timestamp)::date));
alter table public.household_recurring_rules enable row level security;
alter table public.household_recurring_occurrences enable row level security;
drop policy if exists recurring_read on public.household_recurring_rules;
create policy recurring_read on public.household_recurring_rules for select to authenticated using(public.is_household_member(household_id));
drop policy if exists recurring_insert on public.household_recurring_rules;
create policy recurring_insert on public.household_recurring_rules for insert to authenticated with check(created_by=auth.uid() and public.is_household_member(household_id));
drop policy if exists recurring_update on public.household_recurring_rules;
create policy recurring_update on public.household_recurring_rules for update to authenticated using(created_by=auth.uid() and public.is_household_member(household_id)) with check(created_by=auth.uid() and public.is_household_member(household_id));
drop policy if exists recurring_delete on public.household_recurring_rules;
create policy recurring_delete on public.household_recurring_rules for delete to authenticated using(created_by=auth.uid() and public.is_household_member(household_id));
create or replace function public.generate_household_recurring(target_household uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare r record; d date; last_day integer; first_month date; end_month date; added integer:=0; new_expense uuid;
begin
 if auth.uid() is null or not public.is_household_member(target_household) then raise exception 'Household membership required'; end if;
 perform 1 from public.households where id=target_household for update;
 end_month:=date_trunc('month',current_date)::date;
 for r in select * from public.household_recurring_rules where household_id=target_household and active
  and exists(select 1 from public.household_members m where m.household_id=target_household and m.user_id=household_recurring_rules.created_by) loop
  first_month:=date_trunc('month',r.starts_on)::date;
  for d in select generate_series(greatest(first_month,(end_month-interval '119 months')::date),end_month,interval '1 month')::date loop
   last_day:=extract(day from (d+interval '1 month - 1 day'))::int;
   d:=d+(least(r.day_of_month,last_day)-1);
   if d>=r.starts_on and d<=current_date and not exists(select 1 from public.household_recurring_occurrences where rule_id=r.id and occurrence_date>=date_trunc('month',d::timestamp)::date and occurrence_date<(date_trunc('month',d::timestamp)+interval '1 month')::date) then
    insert into public.expenses(owner_id,household_id,scope,amount_paise,category,note,spent_on)
    values(r.created_by,target_household,'household',r.amount_paise,r.category,r.note,d) returning id into new_expense;
    insert into public.household_recurring_occurrences(rule_id,occurrence_date,expense_id) values(r.id,d,new_expense);
    added:=added+1;
   end if;
  end loop;
 end loop;
 return added;
end $$;
revoke all on function public.generate_household_recurring(uuid) from public,anon;
grant execute on function public.generate_household_recurring(uuid) to authenticated;