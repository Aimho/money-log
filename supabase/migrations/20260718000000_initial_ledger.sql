create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

do $$
begin
  create type public.ledger_role as enum ('owner', 'editor');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.ledgers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  event_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A visible, non-empty name is required for the destructive confirmation.
-- Keep this idempotent for projects that already contain unnamed ledgers.
update public.ledgers set name = '이름 없는 행사' where name = '';

create table if not exists public.ledger_members (
  ledger_id uuid not null references public.ledgers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.ledger_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (ledger_id, user_id)
);

create table if not exists public.entries (
  id uuid primary key,
  ledger_id uuid not null references public.ledgers(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  group_name text not null default '',
  amount bigint not null check (amount >= 0),
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Invite tokens are never directly readable. Owners create them and signed-in users
-- redeem them through the security-definer functions below.
create table if not exists public.ledger_invites (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists ledgers_owner_id_idx on public.ledgers(owner_id);
create index if not exists ledger_members_user_id_idx on public.ledger_members(user_id);
create index if not exists entries_ledger_id_created_at_idx on public.entries(ledger_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists ledgers_set_updated_at on public.ledgers;
create trigger ledgers_set_updated_at before update on public.ledgers for each row execute function public.set_updated_at();
drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at before update on public.entries for each row execute function public.set_updated_at();

create or replace function public.protect_entry_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.ledger_id <> old.ledger_id or new.created_by <> old.created_by then
    raise exception 'Entry identity fields are immutable';
  end if;
  return new;
end;
$$;
drop trigger if exists entries_protect_identity on public.entries;
create trigger entries_protect_identity before update on public.entries for each row execute function public.protect_entry_identity();

create or replace function public.add_owner_as_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.ledger_members (ledger_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;
drop trigger if exists ledgers_add_owner_member on public.ledgers;
create trigger ledgers_add_owner_member after insert on public.ledgers for each row execute function public.add_owner_as_member();

alter table public.ledgers enable row level security;
alter table public.ledger_members enable row level security;
alter table public.entries enable row level security;
alter table public.ledger_invites enable row level security;

create or replace function public.is_ledger_member(target_ledger_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ledger_members
    where ledger_id = target_ledger_id and user_id = auth.uid()
  );
$$;

drop policy if exists "Members can read ledgers" on public.ledgers;
drop policy if exists "Users can create owned ledgers" on public.ledgers;
drop policy if exists "Owners can update ledgers" on public.ledgers;
drop policy if exists "Owners can delete ledgers" on public.ledgers;
create policy "Members can read ledgers" on public.ledgers for select using (
  public.is_ledger_member(id)
);
create policy "Users can create owned ledgers" on public.ledgers for insert with check ((select auth.uid()) = owner_id);
create policy "Owners can update ledgers" on public.ledgers for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Owners can delete ledgers" on public.ledgers for delete using ((select auth.uid()) = owner_id);

create or replace function public.create_ledger(ledger_name text, ledger_event_date text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_ledger_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  insert into public.ledgers (owner_id, name, event_date)
  values (auth.uid(), coalesce(nullif(ledger_name, ''), '이름 없는 행사'), nullif(ledger_event_date, ''))
  returning id into new_ledger_id;

  return new_ledger_id;
end;
$$;

drop function if exists public.delete_ledger(uuid);
create or replace function public.delete_ledger(target_ledger_id uuid, confirmed_ledger_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  delete from public.ledgers
  where id = target_ledger_id
    and owner_id = auth.uid()
    and name = confirmed_ledger_name;

  if not found then
    raise exception 'Ledger owner or confirmation name does not match';
  end if;
end;
$$;

drop policy if exists "Members can read memberships" on public.ledger_members;
drop policy if exists "Owners can add memberships" on public.ledger_members;
drop policy if exists "Owners can update memberships" on public.ledger_members;
drop policy if exists "Owners can remove memberships" on public.ledger_members;
create policy "Members can read memberships" on public.ledger_members for select using (
  public.is_ledger_member(ledger_id)
);
create policy "Owners can add memberships" on public.ledger_members for insert with check (
  exists (select 1 from public.ledgers l where l.id = ledger_id and l.owner_id = (select auth.uid()))
);
create policy "Owners can update memberships" on public.ledger_members for update using (
  exists (select 1 from public.ledgers l where l.id = ledger_id and l.owner_id = (select auth.uid()))
);
create policy "Owners can remove memberships" on public.ledger_members for delete using (
  exists (select 1 from public.ledgers l where l.id = ledger_id and l.owner_id = (select auth.uid()))
);

drop policy if exists "Members can read entries" on public.entries;
drop policy if exists "Members can create entries" on public.entries;
drop policy if exists "Members can update entries" on public.entries;
drop policy if exists "Members can delete entries" on public.entries;
create policy "Members can read entries" on public.entries for select using (
  public.is_ledger_member(ledger_id)
);
create policy "Members can create entries" on public.entries for insert with check (
  created_by = (select auth.uid()) and public.is_ledger_member(ledger_id)
);
create policy "Members can update entries" on public.entries for update using (
  public.is_ledger_member(ledger_id)
) with check (
  public.is_ledger_member(ledger_id)
);
create policy "Members can delete entries" on public.entries for delete using (
  public.is_ledger_member(ledger_id)
);

create or replace function public.create_ledger_invite(target_ledger_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare raw_token text := gen_random_uuid()::text || replace(gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.ledgers where id = target_ledger_id and owner_id = auth.uid()) then
    raise exception 'Only the ledger owner can create an invite';
  end if;
  insert into public.ledger_invites (ledger_id, token_hash)
  values (target_ledger_id, encode(extensions.digest(raw_token, 'sha256'), 'hex'));
  return raw_token;
end;
$$;

create or replace function public.accept_ledger_invite(raw_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_ledger_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.ledger_invites i
  where i.token_hash = encode(extensions.digest(accept_ledger_invite.raw_token, 'sha256'), 'hex')
    and i.expires_at > now()
  returning i.ledger_id into target_ledger_id;
  if target_ledger_id is null then raise exception 'Invite is invalid or expired'; end if;
  insert into public.ledger_members (ledger_id, user_id, role) values (target_ledger_id, auth.uid(), 'editor')
  on conflict (ledger_id, user_id) do nothing;
  return target_ledger_id;
end;
$$;

revoke all on function public.create_ledger_invite(uuid) from public;
revoke all on function public.accept_ledger_invite(text) from public;
revoke all on function public.is_ledger_member(uuid) from public;
revoke all on function public.create_ledger(text, text) from public;
revoke all on function public.delete_ledger(uuid, text) from public;
grant execute on function public.create_ledger_invite(uuid) to authenticated;
grant execute on function public.accept_ledger_invite(text) to authenticated;
grant execute on function public.is_ledger_member(uuid) to authenticated;
grant execute on function public.create_ledger(text, text) to authenticated;
grant execute on function public.delete_ledger(uuid, text) to authenticated;

revoke all on public.ledgers, public.ledger_members, public.entries, public.ledger_invites from anon;
grant select, insert, update, delete on public.ledgers to authenticated;
grant select, insert, update, delete on public.ledger_members to authenticated;
grant select, insert, update, delete on public.entries to authenticated;
revoke all on public.ledger_invites from authenticated;
