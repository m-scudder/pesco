-- Called only by the privileged Edge Function after verifying the user's JWT.
-- Transfer an owned household to its remaining member. Never delete partner data.
create or replace function public.prepare_account_deletion(target_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare h record; successor uuid;
begin
 if current_user <> 'postgres' and auth.role() <> 'service_role' then
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
 update public.household_invitations set accepted_by=null where accepted_by=target_user;
 update public.categories set created_by=null where created_by=target_user;
 delete from public.budgets where owner_id=target_user;
 delete from public.expenses where owner_id=target_user;
 delete from public.household_members where user_id=target_user;
 delete from public.household_join_attempts where user_id=target_user;
end $$;
revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
