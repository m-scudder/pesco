-- pgcrypto lives in the extensions schema on hosted Supabase.
create or replace function public.issue_household_invite(target_household uuid)
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
  raw_token := upper(encode(extensions.gen_random_bytes(10),'hex'));
  formatted := 'PESCO-' || substring(raw_token,1,5) || '-' ||
    substring(raw_token,6,5) || '-' || substring(raw_token,11,5) ||
    '-' || substring(raw_token,16,5);
  insert into public.household_invitations(household_id,created_by,token_hash,expires_at)
  values (target_household,caller,sha256(convert_to(raw_token,'UTF8')),now()+interval '24 hours');
  return formatted;
end $$;

