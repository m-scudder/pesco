-- One-time 80-bit invitation keys for anonymous or permanent authenticated users.
-- The key's SHA-256 digest, never the key itself, is persisted.
create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitation_acceptance_consistency check
    ((accepted_by is null and accepted_at is null) or
     (accepted_by is not null and accepted_at is not null))
);
create index household_invitations_household_idx on public.household_invitations(household_id, created_at desc);
alter table public.household_invitations enable row level security;
-- Invites are intentionally not directly readable or writable through PostgREST.

create function public.issue_household_invite(target_household uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare
  caller uuid := auth.uid();
  creator uuid;
  raw_token text;
  formatted text;
begin
  if caller is null then raise exception 'Sign in required'; end if;
  -- Serializes invitation creation with acceptance for this household.
  select created_by into creator from public.households
    where id=target_household for update;
  if creator is null or creator<>caller then
    raise exception 'Only the household creator can invite a member';
  end if;
  if (select count(*) from public.household_members where household_id=target_household)>=2 then
    raise exception 'Household is full';
  end if;
  update public.household_invitations set revoked_at=now()
    where household_id=target_household and accepted_at is null and revoked_at is null;
  -- 10 bytes = 80 cryptographic bits, shown in 4 groups of 5 hex digits.
  raw_token := upper(encode(gen_random_bytes(10),'hex'));
  formatted := 'PESCO-' || substring(raw_token,1,5) || '-' ||
    substring(raw_token,6,5) || '-' || substring(raw_token,11,5) ||
    '-' || substring(raw_token,16,5);
  insert into public.household_invitations(household_id,created_by,token_hash,expires_at)
  values (target_household,caller,sha256(convert_to(raw_token,'UTF8')),now()+interval '24 hours');
  return formatted;
end $$;

create function public.join_household_with_key(joining_key text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
  caller uuid := auth.uid();
  normalized text;
  invite_id uuid;
  target_household uuid;
  actual_household uuid;
begin
  if caller is null then raise exception 'Sign in required'; end if;
  if joining_key is null or length(joining_key)>100 then raise exception 'Invalid joining key'; end if;
  normalized := upper(regexp_replace(joining_key,'[^A-Za-z0-9]','','g'));
  if normalized !~ '^PESCO[0-9A-F]{20}$' then raise exception 'Invalid joining key'; end if;
  if exists (select 1 from public.household_members where user_id=caller) then
    raise exception 'You already belong to a household';
  end if;
  select i.id,i.household_id into invite_id,target_household
    from public.household_invitations i
    where i.token_hash=sha256(convert_to(substring(normalized,6),'UTF8'));
  if invite_id is null then raise exception 'Invalid or expired joining key'; end if;
  -- Lock household before invitation row to serialize concurrent joins.
  perform 1 from public.households where id=target_household for update;
  select i.household_id into actual_household
    from public.household_invitations i
    where i.id=invite_id and i.accepted_at is null and i.revoked_at is null
      and i.expires_at>now() for update;
  if actual_household is null then raise exception 'Invalid or expired joining key'; end if;
  if (select count(*) from public.household_members where household_id=actual_household)>=2 then
    raise exception 'Household is full';
  end if;
  insert into public.household_members(household_id,user_id)
    values (actual_household,caller);
  update public.household_invitations set accepted_at=now(),accepted_by=caller where id=invite_id;
  return actual_household;
end $$;

revoke all on function public.issue_household_invite(uuid) from public,anon;
revoke all on function public.join_household_with_key(text) from public,anon;
grant execute on function public.issue_household_invite(uuid) to authenticated;
grant execute on function public.join_household_with_key(text) to authenticated;

-- Keep all future functions non-executable by PUBLIC unless explicitly granted.
alter default privileges in schema public revoke execute on functions from public;
