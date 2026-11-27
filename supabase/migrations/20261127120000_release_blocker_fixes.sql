-- Release blocker fixes:
--  1. Account deletion no longer fails for members of a shared household.
--  2. prepare_account_deletion has a working caller check.
--  3. Members can leave a household (ownership passes to the partner).
--  4. Removed or departed members can no longer delete household expenses.
--  5. Anonymous sessions cannot attempt household joining keys.
--  6. Recurring generation follows the member's local date, not UTC.

-- (1) Category creator may be anonymised (set to NULL) but never reassigned.
create or replace function public.guard_category_identity()
returns trigger language plpgsql set search_path=''
as $$
begin
 if new.household_id is distinct from old.household_id
    or (new.created_by is distinct from old.created_by and new.created_by is not null) then
  raise exception 'Category household and creator cannot change';
 end if;
 new.created_at=old.created_at;
 return new;
end $$;
revoke execute on function public.guard_category_identity() from public,anon,authenticated;

-- (1)+(2) Account deletion preparation.
create or replace function public.prepare_account_deletion(target_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare h record; successor uuid;
begin
 -- current_user is always the definer here, so check the real session and JWT role.
 if session_user not in ('postgres','supabase_admin')
    and coalesce(auth.role(),'') <> 'service_role' then
  raise exception 'Service role required';
 end if;
 for h in select id from public.households where created_by=target_user for update loop
  select user_id into successor from public.household_members
    where household_id=h.id and user_id<>target_user order by joined_at limit 1;
  if successor is null then
   delete from public.household_recurring_occurrences o using public.household_recurring_rules r where o.rule_id=r.id and r.household_id=h.id;
   delete from public.household_recurring_rules where household_id=h.id;
   delete from public.household_invitations where household_id=h.id;
   delete from public.category_budgets where household_id=h.id;
   delete from public.household_budgets where household_id=h.id;
   delete from public.categories where household_id=h.id;
   delete from public.budgets where household_id=h.id;
   delete from public.expenses where household_id=h.id;
   delete from public.household_members where household_id=h.id;
   delete from public.households where id=h.id;
  else
   update public.households set created_by=successor where id=h.id;
  end if;
 end loop;
 delete from public.household_recurring_occurrences where expense_id in (select id from public.expenses where owner_id=target_user);
 delete from public.household_recurring_occurrences where rule_id in (select id from public.household_recurring_rules where created_by=target_user);
 delete from public.household_recurring_rules where created_by=target_user;
 delete from public.household_invitations where created_by=target_user;
 -- An accepted invitation cannot exist without its acceptor; clearing only accepted_by
 -- violated invitation_acceptance_consistency and aborted every partner's deletion.
 delete from public.household_invitations where accepted_by=target_user;
 update public.categories set created_by=null where created_by=target_user;
 delete from public.budgets where owner_id=target_user;
 delete from public.expenses where owner_id=target_user;
 delete from public.household_members where user_id=target_user;
 delete from public.household_join_attempts where user_id=target_user;
end $$;
revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

-- (3) Leave the current household. The creator hands ownership to the partner.
-- The only remaining member cannot leave, so a household is never orphaned.
create or replace function public.leave_household()
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); target uuid; creator uuid; successor uuid;
begin
 if caller is null then raise exception 'Authentication required'; end if;
 select household_id into target from public.household_members where user_id=caller;
 if target is null then raise exception 'You are not in a household'; end if;
 select created_by into creator from public.households where id=target for update;
 select user_id into successor from public.household_members
  where household_id=target and user_id<>caller order by joined_at limit 1;
 if successor is null then
  raise exception 'You are the only member of this household';
 end if;
 if creator=caller then
  update public.households set created_by=successor where id=target;
 end if;
 delete from public.household_members where household_id=target and user_id=caller;
 -- Stop the departing member's bills; prevents a backfill if they ever rejoin.
 update public.household_recurring_rules set active=false where household_id=target and created_by=caller;
 update public.household_invitations set revoked_at=now()
  where household_id=target and accepted_at is null and revoked_at is null;
end $$;
revoke all on function public.leave_household() from public, anon;
grant execute on function public.leave_household() to authenticated;

create or replace function public.remove_household_partner(target_household uuid,partner_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare creator uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select h.created_by into creator from public.households h
 where h.id=target_household for update;
 if creator is null or creator<>auth.uid() then
  raise exception 'Only the household creator can remove the partner';
 end if;
 if partner_id is null or partner_id=creator then
  raise exception 'Cannot remove household creator';
 end if;
 delete from public.household_members
 where household_id=target_household and user_id=partner_id;
 if not found then raise exception 'Partner not in this household'; end if;
 update public.household_recurring_rules set active=false
 where household_id=target_household and created_by=partner_id;
 update public.household_invitations set revoked_at=now()
 where household_id=target_household and accepted_at is null and revoked_at is null;
end $$;
revoke all on function public.remove_household_partner(uuid,uuid) from public,anon;
grant execute on function public.remove_household_partner(uuid,uuid) to authenticated;

-- (4) A household expense can only be deleted by its owner while still a member.
drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses for delete to authenticated
using (
 owner_id=(select auth.uid()) and (
  scope='personal' or public.is_household_member(household_id)
 )
);

-- (5) Joining keys: anonymous sessions are rejected (the app requires Google or
-- Apple sign-in). Without this, throwaway anonymous accounts bypass the
-- per-account attempt limit and can guess the 6-character key space.
create or replace function public.join_household_with_key(joining_key text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
  caller uuid := auth.uid();
  normalized text;
  invite_id uuid;
  target_household uuid;
  active_household uuid;
begin
  if caller is null then raise exception 'Sign in required'; end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'Sign in with Google or Apple to join a household';
  end if;
  -- Serialize concurrent requests from one identity, even against different keys.
  perform 1 from auth.users where id=caller for update;
  if (select count(*) from public.household_join_attempts
      where user_id=caller and attempted_at>now()-interval '1 hour') >= 5
    or (select count(*) from public.household_join_attempts
      where user_id=caller and attempted_at>now()-interval '1 day') >= 20 then
    -- Returning NULL instead of throwing preserves the audit row transaction below.
    return null;
  end if;
  insert into public.household_join_attempts(user_id) values (caller);
  if joining_key is null or length(joining_key)>32 then return null; end if;
  normalized := upper(regexp_replace(joining_key,'[ -]','','g'));
  if normalized !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then return null; end if;
  if exists (select 1 from public.household_members where user_id=caller) then return null; end if;
  select id, household_id into invite_id,target_household
   from public.household_invitations
   where token_hash=sha256(convert_to(normalized,'UTF8'));
  if invite_id is null then return null; end if;
  -- Lock order: household first, invitation second; single use under concurrent joins.
  perform 1 from public.households where id=target_household for update;
  select household_id into active_household
   from public.household_invitations
   where id=invite_id and accepted_at is null and revoked_at is null
    and expires_at>now() for update;
  if active_household is null then return null; end if;
  if (select count(*) from public.household_members where household_id=active_household) >= 2 then return null; end if;
  insert into public.household_members(household_id,user_id)
    values(active_household,caller);
  update public.household_invitations set accepted_at=now(),accepted_by=caller where id=invite_id;
  return active_household;
end $$;
revoke all on function public.join_household_with_key(text) from public,anon;
grant execute on function public.join_household_with_key(text) to authenticated;

-- (6) Recurring generation uses the caller's local date when it is within one day
-- of the server's UTC date (covers every real timezone), otherwise UTC.
drop function if exists public.generate_household_recurring(uuid);
create function public.generate_household_recurring(target_household uuid, client_today date default null)
returns integer language plpgsql security definer set search_path='' as $$
declare r record; d date; last_day integer; first_month date; end_month date; today date; added integer:=0; new_expense uuid;
begin
 if auth.uid() is null or not public.is_household_member(target_household) then raise exception 'Household membership required'; end if;
 today := case when client_today between current_date-1 and current_date+1 then client_today else current_date end;
 perform 1 from public.households where id=target_household for update;
 end_month:=date_trunc('month',today)::date;
 for r in select * from public.household_recurring_rules where household_id=target_household and active
  and exists(select 1 from public.household_members m where m.household_id=target_household and m.user_id=household_recurring_rules.created_by) loop
  first_month:=date_trunc('month',r.starts_on)::date;
  for d in select generate_series(greatest(first_month,(end_month-interval '119 months')::date),end_month,interval '1 month')::date loop
   last_day:=extract(day from (d+interval '1 month - 1 day'))::int;
   d:=d+(least(r.day_of_month,last_day)-1);
   if d>=r.starts_on and d<=today and not exists(select 1 from public.household_recurring_occurrences where rule_id=r.id and occurrence_date>=date_trunc('month',d::timestamp)::date and occurrence_date<(date_trunc('month',d::timestamp)+interval '1 month')::date) then
    insert into public.expenses(owner_id,household_id,scope,amount_paise,category,note,spent_on)
    values(r.created_by,target_household,'household',r.amount_paise,r.category,r.note,d) returning id into new_expense;
    insert into public.household_recurring_occurrences(rule_id,occurrence_date,expense_id) values(r.id,d,new_expense);
    added:=added+1;
   end if;
  end loop;
 end loop;
 return added;
end $$;
revoke all on function public.generate_household_recurring(uuid,date) from public,anon;
grant execute on function public.generate_household_recurring(uuid,date) to authenticated;
