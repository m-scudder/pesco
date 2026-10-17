-- Premium entitlement foundation. Entitlements are SERVER-MANAGED only.
-- Store billing webhooks, never the mobile client, must update these rows.
create table if not exists public.household_entitlements(
 household_id uuid primary key references public.households(id) on delete cascade,
 tier text not null default 'free' check(tier in ('free','plus')),
 valid_until timestamptz,
 provider text,
 external_subscription_id text,
 updated_at timestamptz not null default now(),
 check(tier='free' or (valid_until is not null and provider is not null))
);
alter table public.household_entitlements enable row level security;
create policy household_entitlements_select on public.household_entitlements
 for select to authenticated using(public.is_household_member(household_id));
-- No client INSERT/UPDATE/DELETE policies. Billing verification must run server-side.
revoke all on public.household_entitlements from public,anon,authenticated;
grant select on public.household_entitlements to authenticated;

create or replace function public.household_member_limit(target_household uuid)
returns integer language sql stable security definer set search_path='' as $$
 select case when exists(
  select 1 from public.household_entitlements e
  where e.household_id=target_household and e.tier='plus' and e.valid_until>now()
 ) then 6 else 2 end;
$$;
revoke all on function public.household_member_limit(uuid) from public,anon;
grant execute on function public.household_member_limit(uuid) to authenticated;

-- Replaces 2-member hard limit without weakening invite issuance/throttling.
create or replace function public.issue_household_invite(target_household uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare
 caller uuid := auth.uid();
 creator uuid;
 alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 raw_token text := '';
 random_bytes bytea;
 i integer;
begin
 if caller is null then raise exception 'Sign in required'; end if;
 select created_by into creator from public.households
  where id = target_household for update;
 if creator is null or creator <> caller then
  raise exception 'Only the household creator can invite a member';
 end if;
 if (select count(*) from public.household_members where household_id=target_household)
    >= public.household_member_limit(target_household) then
  raise exception 'Household is full';
 end if;
 update public.household_invitations set revoked_at=now()
  where household_id=target_household and accepted_at is null and revoked_at is null;
 random_bytes := extensions.gen_random_bytes(6);
 for i in 0..5 loop
  raw_token := raw_token || substr(alphabet,(get_byte(random_bytes,i)%32)+1,1);
 end loop;
 insert into public.household_invitations(household_id,created_by,token_hash,expires_at)
 values(target_household,caller,sha256(convert_to(raw_token,'UTF8')),now()+interval '24 hours');
 return raw_token;
end $$;

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
 perform 1 from auth.users where id=caller for update;
 if (select count(*) from public.household_join_attempts
     where user_id=caller and attempted_at>now()-interval '1 hour')>=5
  or (select count(*) from public.household_join_attempts
     where user_id=caller and attempted_at>now()-interval '1 day')>=20 then
  return null;
 end if;
 insert into public.household_join_attempts(user_id) values(caller);
 if joining_key is null or length(joining_key)>32 then return null; end if;
 normalized:=upper(regexp_replace(joining_key,'[ -]','','g'));
 if normalized !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then return null; end if;
 if exists(select 1 from public.household_members where user_id=caller) then return null; end if;
 select id,household_id into invite_id,target_household
  from public.household_invitations where token_hash=sha256(convert_to(normalized,'UTF8'));
 if invite_id is null then return null; end if;
 perform 1 from public.households where id=target_household for update;
 select household_id into active_household from public.household_invitations
  where id=invite_id and accepted_at is null and revoked_at is null
  and expires_at>now() for update;
 if active_household is null then return null; end if;
 if (select count(*) from public.household_members where household_id=active_household)
    >= public.household_member_limit(active_household) then return null; end if;
 insert into public.household_members(household_id,user_id) values(active_household,caller);
 update public.household_invitations set accepted_at=now(),accepted_by=caller where id=invite_id;
 return active_household;
end $$;

revoke all on function public.issue_household_invite(uuid) from public,anon;
revoke all on function public.join_household_with_key(text) from public,anon;
grant execute on function public.issue_household_invite(uuid) to authenticated;
grant execute on function public.join_household_with_key(text) to authenticated;
