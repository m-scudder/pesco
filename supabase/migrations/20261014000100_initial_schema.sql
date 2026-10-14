-- PESCO baseline schema. Apply only to a dedicated Supabase project.
-- All amounts are integer paise; ownership and expense scope are immutable.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id,user_id),
  unique (user_id)
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  household_id uuid references public.households(id),
  scope text not null check (scope in ('personal','household')),
  amount_paise bigint not null check (amount_paise > 0),
  category text not null check (char_length(trim(category)) between 1 and 80),
  note text not null default '' check (char_length(note) <= 500),
  spent_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_expense_scope check (
    (scope='personal' and household_id is null) or
    (scope='household' and household_id is not null)
  )
);
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  household_id uuid references public.households(id),
  scope text not null check (scope in ('personal','household')),
  amount_paise bigint not null check (amount_paise > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_budget_scope check (
    (scope='personal' and household_id is null) or
    (scope='household' and household_id is not null)
  )
);
create unique index budgets_one_personal_per_owner on public.budgets(owner_id) where scope='personal';
create unique index budgets_one_household_per_household on public.budgets(household_id) where scope='household';
create index expenses_personal_feed on public.expenses(owner_id, spent_on desc, created_at desc) where scope='personal';
create index expenses_household_feed on public.expenses(household_id, spent_on desc, created_at desc) where scope='household';

-- SECURITY DEFINER avoids RLS recursion when checking membership.
create function public.is_household_member(target uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists (
  select 1 from public.household_members m
  where m.household_id=target and m.user_id=(select auth.uid())
) $$;
revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

-- Forbid changing owner, scope or household after creation.
create function public.guard_expense_identity()
returns trigger language plpgsql set search_path=''
as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.scope is distinct from old.scope
     or new.household_id is distinct from old.household_id then
    raise exception 'Expense ownership and scope cannot be changed';
  end if;
  new.created_at=old.created_at;
  new.updated_at=now();
  return new;
end $$;
create trigger expenses_guard_identity before update on public.expenses
for each row execute function public.guard_expense_identity();

create function public.guard_budget_identity()
returns trigger language plpgsql set search_path=''
as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.scope is distinct from old.scope
     or new.household_id is distinct from old.household_id then
    raise exception 'Budget ownership and scope cannot be changed';
  end if;
  new.created_at=old.created_at;
  new.updated_at=now();
  return new;
end $$;
create trigger budgets_guard_identity before update on public.budgets
for each row execute function public.guard_budget_identity();

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;

create policy profiles_read_self on public.profiles for select to authenticated
using (id=(select auth.uid()));
create policy profiles_insert_self on public.profiles for insert to authenticated
with check (id=(select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
using (id=(select auth.uid())) with check (id=(select auth.uid()));

create policy households_read_members on public.households for select to authenticated
using (public.is_household_member(id));
create policy household_members_read_members on public.household_members for select to authenticated
using (public.is_household_member(household_id));
-- Household/membership writes deliberately disallowed until audited invitation RPCs.

create policy expenses_read on public.expenses for select to authenticated
using (
  (scope='personal' and owner_id=(select auth.uid())) or
  (scope='household' and public.is_household_member(household_id))
);
create policy expenses_insert on public.expenses for insert to authenticated
with check (
  owner_id=(select auth.uid()) and (
    (scope='personal' and household_id is null) or
    (scope='household' and public.is_household_member(household_id))
  )
);
create policy expenses_update on public.expenses for update to authenticated
using (owner_id=(select auth.uid()))
with check (
  owner_id=(select auth.uid()) and (
    (scope='personal' and household_id is null) or
    (scope='household' and public.is_household_member(household_id))
  )
);
create policy expenses_delete on public.expenses for delete to authenticated
using (owner_id=(select auth.uid()));

create policy budgets_read on public.budgets for select to authenticated
using ((scope='personal' and owner_id=(select auth.uid())) or
       (scope='household' and public.is_household_member(household_id)));
create policy budgets_insert on public.budgets for insert to authenticated
with check (owner_id=(select auth.uid()) and (
 (scope='personal' and household_id is null) or
 (scope='household' and public.is_household_member(household_id))
));
create policy budgets_update on public.budgets for update to authenticated
using (owner_id=(select auth.uid()))
with check (owner_id=(select auth.uid()) and (
 (scope='personal' and household_id is null) or
 (scope='household' and public.is_household_member(household_id))
));
create policy budgets_delete on public.budgets for delete to authenticated
using (owner_id=(select auth.uid()));

-- An authenticated user creates a household and joins it in one transaction.
create function public.create_household(household_name text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if household_name is null or char_length(trim(household_name)) not between 1 and 100 then
    raise exception 'Invalid household name';
  end if;
  if exists (select 1 from public.household_members where user_id=auth.uid()) then
    raise exception 'Already in a household';
  end if;
  insert into public.households(name,created_by) values(trim(household_name),auth.uid())
  returning id into new_id;
  insert into public.household_members(household_id,user_id) values(new_id,auth.uid());
  return new_id;
end $$;
revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;

-- NOTE: inviter/accept-invite RPCs, storage policies and realtime are a later migration.
