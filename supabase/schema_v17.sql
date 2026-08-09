-- ============================================================================
--  Duo Budget — Schema upgrade v17  (stored receipt images)
--  Additive + idempotent. Run in Supabase -> SQL Editor -> New query -> Run.
--  Make sure you are in the duo-budget project (URL contains bckxqcyyvhxlcfbyvgzl).
-- ============================================================================

-- Where the scanned photo lives in the `receipts` bucket. Null = no image kept.
-- The path is always '<expense id>/<filename>', which is what the storage
-- policies below rely on to decide who may see the picture.
alter table public.expenses add column if not exists receipt_path text;

-- Private bucket — nothing here is ever served publicly; the app asks for a
-- short-lived signed URL each time it shows an image.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- ---------- Storage access mirrors expense visibility exactly ----------------
--   * a shared expense's receipt: visible to the whole household
--   * a private / business receipt: visible ONLY to the person who paid
--   * only the payer may upload, replace or delete their own receipt
-- Without this the partner could read every image by guessing paths, which
-- would quietly undo the privacy split the expenses table enforces.
drop policy if exists receipts_select on storage.objects;
drop policy if exists receipts_insert on storage.objects;
drop policy if exists receipts_update on storage.objects;
drop policy if exists receipts_delete on storage.objects;

create policy receipts_select on storage.objects for select using (
  bucket_id = 'receipts'
  and exists (
    select 1 from public.expenses e
    where e.id::text = (storage.foldername(name))[1]
      and (e.paid_by = auth.uid()
           or (e.scope = 'shared' and e.household_id = public.current_household_id()))
  )
);

create policy receipts_insert on storage.objects for insert with check (
  bucket_id = 'receipts'
  and exists (
    select 1 from public.expenses e
    where e.id::text = (storage.foldername(name))[1] and e.paid_by = auth.uid()
  )
);

create policy receipts_update on storage.objects for update using (
  bucket_id = 'receipts'
  and exists (
    select 1 from public.expenses e
    where e.id::text = (storage.foldername(name))[1] and e.paid_by = auth.uid()
  )
);

create policy receipts_delete on storage.objects for delete using (
  bucket_id = 'receipts'
  and exists (
    select 1 from public.expenses e
    where e.id::text = (storage.foldername(name))[1] and e.paid_by = auth.uid()
  )
);

-- Deleting an expense should not leave its picture behind paying for storage
-- forever. Storage rows live outside our schema, so clean them up on delete.
create or replace function public.drop_receipt_object()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.receipt_path is not null then
    delete from storage.objects
    where bucket_id = 'receipts' and name = old.receipt_path;
  end if;
  return old;
end;
$$;

drop trigger if exists expenses_drop_receipt on public.expenses;
create trigger expenses_drop_receipt
  after delete on public.expenses
  for each row execute function public.drop_receipt_object();
