-- Six-character human-readable household invitations.
-- 32^6 = 1,073,741,824 possible values (~30 bits).
-- Security relies on random generation, short expiry, single use and RPC throttling.
create table public.household_join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index household_join_attempts_user_time_idx
  on public.household_join_attempts(user_id, attempted_at desc);
alter table public.household_join_attempts enable row level security;
-- No direct read or write policies. SECURITY DEFINER RPC owns the audit log.

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
  if (select count(*) from public.household_members where household_id=target_household) >= 2 then
    raise exception 'Household is full';
  end if;
  -- Every new key revokes the previous outstanding key.
  update public.household_invitations set revoked_at=now()
   where household_id=target_household and accepted_at is null and revoked_at is null;
  random_bytes := extensions.gen_random_bytes(6);
  for i in 0..5 loop
    raw_token := raw_token || substr(alphabet, (get_byte(random_bytes,i) % 32)+1, 1);
  end loop;
  insert into public.household_invitations(household_id,created_by,token_hash,expires_at)
  values (target_household,caller,sha256(convert_to(raw_token,'UTF8')),now()+interval '24 hours');
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

revoke all on function public.issue_household_invite(uuid) from public,anon;
revoke all on function public.join_household_with_key(text) from public,anon;
grant execute on function public.issue_household_invite(uuid) to authenticated;
grant execute on function public.join_household_with_key(text) to authenticated;
-- Supersede any outstanding old-format invitations.
update public.household_invitations set revoked_at=now()
 where accepted_at is null and revoked_at is null;
