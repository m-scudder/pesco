-- Server-enforced premium receipt creation and per-expense quota.
-- Existing receipts remain readable after expiry.
create or replace function public.validate_expense_receipt_insert()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_scope text;
declare target_household uuid;
declare receipt_count integer;
begin
 select e.scope,e.household_id into target_scope,target_household
 from public.expenses e where e.id=new.expense_id and e.owner_id=auth.uid();
 if not found then raise exception 'Only the expense creator can attach a receipt'; end if;
 if target_scope='household' and not exists(
   select 1 from public.household_entitlements h
   where h.household_id=target_household and h.tier='plus' and h.valid_until>now()
 ) then raise exception 'PESCO Plus is required to attach receipts'; end if;
 -- Personal receipts cannot use a household plan without membership.
 if target_scope='personal' and not exists(
   select 1 from public.household_members m
   join public.household_entitlements h on h.household_id=m.household_id
   where m.user_id=auth.uid() and h.tier='plus' and h.valid_until>now()
 ) then raise exception 'PESCO Plus is required to attach receipts'; end if;
 select count(*) into receipt_count from public.expense_receipts r where r.expense_id=new.expense_id;
 if receipt_count>=5 then raise exception 'Receipt limit reached'; end if;
 return new;
end $$;
create trigger receipt_plus_guard before insert on public.expense_receipts
 for each row execute function public.validate_expense_receipt_insert();
-- Prevent direct storage upload from bypassing the premium gate.
drop policy if exists expense_receipt_storage_upload on storage.objects;
create policy expense_receipt_storage_upload on storage.objects for insert to authenticated
 with check(bucket_id='expense-receipts' and exists(
  select 1 from public.expenses e
  where e.id::text=split_part(name,'/',1) and e.owner_id=auth.uid()
   and exists(
    select 1 from public.household_members m
    join public.household_entitlements h on h.household_id=m.household_id
    where m.user_id=auth.uid() and h.tier='plus' and h.valid_until>now()
   )
 ));
