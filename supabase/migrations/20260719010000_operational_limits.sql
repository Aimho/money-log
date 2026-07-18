-- Operational limits are added NOT VALID so legacy rows do not block rollout.
-- PostgreSQL still enforces NOT VALID CHECK constraints for new and updated rows.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'ledgers_name_length_check'
      and conrelid = 'public.ledgers'::regclass
  ) then
    alter table public.ledgers
      add constraint ledgers_name_length_check
      check (char_length(name) between 1 and 120) not valid;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'ledgers_event_date_length_check'
      and conrelid = 'public.ledgers'::regclass
  ) then
    alter table public.ledgers
      add constraint ledgers_event_date_length_check
      check (event_date is null or char_length(event_date) <= 64) not valid;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'entries_name_length_check'
      and conrelid = 'public.entries'::regclass
  ) then
    alter table public.entries
      add constraint entries_name_length_check
      check (char_length(name) between 1 and 120) not valid;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'entries_group_name_length_check'
      and conrelid = 'public.entries'::regclass
  ) then
    alter table public.entries
      add constraint entries_group_name_length_check
      check (char_length(group_name) <= 80) not valid;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'entries_memo_length_check'
      and conrelid = 'public.entries'::regclass
  ) then
    alter table public.entries
      add constraint entries_memo_length_check
      check (char_length(memo) <= 1000) not valid;
  end if;
end
$$;

-- Serialize ledger creation per user so concurrent requests cannot pass the
-- count check together.
create or replace function public.create_ledger(ledger_name text, ledger_event_date text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  new_ledger_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ledger-owner:' || current_user_id::text, 0)
  );

  if (select count(*) from public.ledgers where owner_id = current_user_id) >= 20 then
    raise exception 'Ledger limit reached';
  end if;

  insert into public.ledgers (owner_id, name, event_date)
  values (
    current_user_id,
    coalesce(nullif(ledger_name, ''), '이름 없는 행사'),
    nullif(ledger_event_date, '')
  )
  returning id into new_ledger_id;

  return new_ledger_id;
end;
$$;

-- Authenticated users also have direct INSERT access to ledgers, so the same
-- quota must exist below the RPC boundary.
create or replace function public.enforce_ledger_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
begin
  -- RLS is evaluated after BEFORE triggers. Reject a forged owner before it can
  -- use this definer trigger to lock or probe another user's quota.
  if current_user_id is not null and new.owner_id <> current_user_id then
    raise exception 'Ledger owner must match authenticated user';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ledger-owner:' || new.owner_id::text, 0)
  );

  if (select count(*) from public.ledgers where owner_id = new.owner_id) >= 20 then
    raise exception 'Ledger limit reached';
  end if;

  return new;
end;
$$;

drop trigger if exists ledgers_enforce_limit on public.ledgers;
create trigger ledgers_enforce_limit
before insert on public.ledgers
for each row execute function public.enforce_ledger_limit();

-- Direct entry inserts remain available through PostgREST, so the per-ledger
-- quota is enforced in a trigger. Existing IDs are allowed through because an
-- UPSERT fires BEFORE INSERT even when it will update an existing row.
create or replace function public.enforce_entry_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
begin
  -- Service-role maintenance has no auth.uid(); authenticated requests must be
  -- members before this definer trigger performs quota reads or takes a lock.
  if current_user_id is not null and not public.is_ledger_member(new.ledger_id) then
    raise exception 'Ledger membership required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ledger-entries:' || new.ledger_id::text, 0)
  );

  if exists (select 1 from public.entries where id = new.id) then
    return new;
  end if;

  if (select count(*) from public.entries where ledger_id = new.ledger_id) >= 5000 then
    raise exception 'Entry limit reached';
  end if;

  return new;
end;
$$;

drop trigger if exists entries_enforce_limit on public.entries;
create trigger entries_enforce_limit
before insert on public.entries
for each row execute function public.enforce_entry_limit();

-- Expired invitations do not count toward the active limit and are removed
-- whenever an owner requests another invitation. The lock closes the race
-- between concurrent invite requests for the same ledger.
create or replace function public.create_ledger_invite(target_ledger_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  raw_token text := gen_random_uuid()::text || replace(gen_random_uuid()::text, '-', '');
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  if not exists (
    select 1 from public.ledgers
    where id = target_ledger_id and owner_id = current_user_id
  ) then
    raise exception 'Only the ledger owner can create an invite';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ledger-invites:' || target_ledger_id::text, 0)
  );

  delete from public.ledger_invites
  where ledger_id = target_ledger_id and expires_at <= now();

  if (
    select count(*) from public.ledger_invites
    where ledger_id = target_ledger_id and expires_at > now()
  ) >= 20 then
    raise exception 'Active invite limit reached';
  end if;

  insert into public.ledger_invites (ledger_id, token_hash)
  values (target_ledger_id, encode(extensions.digest(raw_token, 'sha256'), 'hex'));

  return raw_token;
end;
$$;

-- CREATE OR REPLACE retains existing privileges, but restate the intended
-- boundary so this migration is safe after manual or partial deployments.
revoke all on function public.create_ledger(text, text) from public;
revoke all on function public.create_ledger_invite(uuid) from public;
grant execute on function public.create_ledger(text, text) to authenticated;
grant execute on function public.create_ledger_invite(uuid) to authenticated;
