create extension if not exists pgcrypto;

create schema if not exists private;

revoke all on schema private from public;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  key text not null unique,
  credits integer not null default 0 check (credits >= 0),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  last_used timestamptz,
  total_used integer not null default 0 check (total_used >= 0),
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  blocked_until timestamptz
);

create index if not exists api_keys_created_at_idx
  on public.api_keys(created_at desc);

create index if not exists api_keys_status_idx
  on public.api_keys(status);

alter table public.profiles enable row level security;
alter table public.api_keys enable row level security;

drop policy if exists profiles_select_own on public.profiles;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

revoke all on table public.profiles from anon;
grant select on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

revoke all on table public.api_keys from anon, authenticated;
grant all on table public.api_keys to service_role;

create or replace function private.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, false)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function private.handle_new_user_profile();

revoke all on function private.handle_new_user_profile() from public, anon, authenticated;
