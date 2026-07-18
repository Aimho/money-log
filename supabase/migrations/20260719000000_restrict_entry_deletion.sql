drop policy if exists "Members can delete entries" on public.entries;

create policy "Owners or authors can delete entries"
on public.entries
for delete
using (
  exists (
    select 1
    from public.ledgers l
    where l.id = entries.ledger_id
      and l.owner_id = (select auth.uid())
  )
  or (
    public.is_ledger_member(entries.ledger_id)
    and created_by = (select auth.uid())
  )
);
