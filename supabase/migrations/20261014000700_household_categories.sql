-- Editable shared household categories. Expense category text is a historical snapshot:
-- renaming/deleting a category changes future selection, not past transactions.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40 and name=btrim(name)),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index categories_household_name_unique on public.categories(household_id, lower(name));
create index categories_household_idx on public.categories(household_id);

create function public.guard_category_identity()
returns trigger language plpgsql set search_path=''
as $$
begin
 if new.household_id is distinct from old.household_id
    or new.created_by is distinct from old.created_by then
  raise exception 'Category household and creator cannot change';
 end if;
 new.created_at=old.created_at;
 return new;
end $$;
create trigger categories_guard_identity before update on public.categories
 for each row execute function public.guard_category_identity();
revoke execute on function public.guard_category_identity() from public,anon,authenticated;

alter table public.categories enable row level security;
create policy categories_read on public.categories for select to authenticated
 using (public.is_household_member(household_id));
create policy categories_insert on public.categories for insert to authenticated
 with check (public.is_household_member(household_id) and created_by=(select auth.uid()));
create policy categories_update on public.categories for update to authenticated
 using (public.is_household_member(household_id))
 with check (public.is_household_member(household_id));
create policy categories_delete on public.categories for delete to authenticated
 using (public.is_household_member(household_id));

-- Seed only missing names. Existing household expenses stay unchanged.
insert into public.categories(household_id,name,created_by)
select h.id, preset.name, h.created_by
from public.households h
cross join (values
 ('Groceries'),('Food & Drinks'),('Transport'),('Bills'),
 ('Shopping'),('Health'),('Entertainment'),('Other')
) as preset(name)
on conflict do nothing;

-- Future households start with the same editable presets.
create function public.seed_household_categories()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.categories(household_id,name,created_by)
 select new.id,preset.name,new.created_by
 from (values
  ('Groceries'),('Food & Drinks'),('Transport'),('Bills'),
  ('Shopping'),('Health'),('Entertainment'),('Other')
 ) as preset(name);
 return new;
end $$;
create trigger households_seed_categories after insert on public.households
 for each row execute function public.seed_household_categories();
revoke execute on function public.seed_household_categories() from public,anon,authenticated;
