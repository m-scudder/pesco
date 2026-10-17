-- Preserve existing category limits while restricting creation of *new*
-- household category limits for free households to one.
create or replace function public.guard_category_budget_limit()
returns trigger language plpgsql security definer set search_path='' as $$
declare existing_count integer;
begin
 if tg_op='UPDATE' then return new; end if;
 -- Serialize concurrent insert attempts, and allow ON CONFLICT updates.
 perform 1 from public.households where id=new.household_id for update;
 if exists(select 1 from public.category_budgets b where b.household_id=new.household_id and b.category_name=new.category_name) then return new; end if;
 -- The owner/other members may edit or remove existing category limits.
 if exists(select 1 from public.household_entitlements h where h.household_id=new.household_id
    and h.tier='plus' and h.valid_until>now()) then return new; end if;
 select count(*) into existing_count from public.category_budgets b
   where b.household_id=new.household_id;
 if existing_count>=1 then raise exception 'Upgrade to PESCO Plus for additional category limits'; end if;
 return new;
end $$;
create trigger guard_category_budget_limit before insert on public.category_budgets
 for each row execute function public.guard_category_budget_limit();
