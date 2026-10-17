-- Private receipt attachments. Apply only after existing household and expense migrations.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('expense-receipts','expense-receipts',false,5242880,
 array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=5242880,
 allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.expense_receipts(
 id uuid primary key default gen_random_uuid(),
 expense_id uuid not null references public.expenses(id) on delete cascade,
 uploaded_by uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique,
 mime_type text not null,
 file_name text not null check(length(file_name) between 1 and 255),
 size_bytes integer not null check(size_bytes > 0 and size_bytes <= 5242880),
 created_at timestamptz not null default now()
);
create index if not exists expense_receipts_expense_idx on public.expense_receipts(expense_id,created_at);

alter table public.expense_receipts enable row level security;
create policy receipt_metadata_read on public.expense_receipts for select to authenticated
 using(exists(select 1 from public.expenses e where e.id=expense_id
  and (e.owner_id=auth.uid() or (e.scope='household' and public.is_household_member(e.household_id)))));
create policy receipt_metadata_create on public.expense_receipts for insert to authenticated
 with check(uploaded_by=auth.uid() and exists(
  select 1 from public.expenses e where e.id=expense_id and e.owner_id=auth.uid()
 ) and storage_path like expense_id::text || '/%');
create policy receipt_metadata_delete on public.expense_receipts for delete to authenticated
 using(uploaded_by=auth.uid());

-- Storage policy uses the expense UUID embedded in the object key.
create policy expense_receipt_storage_read on storage.objects for select to authenticated
 using(bucket_id='expense-receipts' and exists(
  select 1 from public.expenses e where e.id::text=split_part(name,'/',1)
  and (e.owner_id=auth.uid() or (e.scope='household' and public.is_household_member(e.household_id)))));
create policy expense_receipt_storage_upload on storage.objects for insert to authenticated
 with check(bucket_id='expense-receipts' and exists(
  select 1 from public.expenses e where e.id::text=split_part(name,'/',1)
  and e.owner_id=auth.uid()));
create policy expense_receipt_storage_delete on storage.objects for delete to authenticated
 using(bucket_id='expense-receipts' and exists(
  select 1 from public.expenses e where e.id::text=split_part(name,'/',1)
  and e.owner_id=auth.uid()));

revoke all on public.expense_receipts from public,anon;
grant select,insert,delete on public.expense_receipts to authenticated;
