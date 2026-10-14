-- Owner-controlled household management; user_id is globally unique in household_members.
create or replace function public.household_roster(target_household uuid)
returns table(user_id uuid, display_name text, joined_at timestamptz, is_owner boolean)
language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not exists(
  select 1 from public.household_members m
  where m.household_id=target_household and m.user_id=auth.uid()
 ) then raise exception 'Not a member of this household'; end if;
 return query
  select m.user_id, coalesce(nullif(trim(p.display_name),''),'Member')::text,
         m.joined_at, h.created_by=m.user_id
  from public.household_members m
  join public.households h on h.id=m.household_id
  left join public.profiles p on p.id=m.user_id
  where m.household_id=target_household
  order by (h.created_by=m.user_id) desc,m.joined_at;
end $$;

create or replace function public.rename_household(target_household uuid,new_name text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not exists(
  select 1 from public.households h
  join public.household_members m on m.household_id=h.id
  where h.id=target_household and h.created_by=auth.uid() and m.user_id=auth.uid()
 ) then raise exception 'Only the household creator can rename it'; end if;
 if new_name is null or char_length(trim(new_name)) not between 1 and 100 then
  raise exception 'Household name must contain 1 to 100 characters';
 end if;
 update public.households set name=trim(new_name) where id=target_household;
end $$;

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
 update public.household_invitations set revoked_at=now()
 where household_id=target_household and accepted_at is null and revoked_at is null;
end $$;

revoke all on function public.household_roster(uuid) from public,anon;
revoke all on function public.rename_household(uuid,text) from public,anon;
revoke all on function public.remove_household_partner(uuid,uuid) from public,anon;
grant execute on function public.household_roster(uuid) to authenticated;
grant execute on function public.rename_household(uuid,text) to authenticated;
grant execute on function public.remove_household_partner(uuid,uuid) to authenticated;
