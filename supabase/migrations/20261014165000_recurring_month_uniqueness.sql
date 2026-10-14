create unique index if not exists household_recurring_one_per_month on public.household_recurring_occurrences(rule_id,(date_trunc('month',occurrence_date::timestamp)::date));
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