create extension if not exists pgcrypto;

create table if not exists public.api_generation_cycles (
  id uuid primary key default gen_random_uuid(),
  api_key text not null,
  preset_id text not null,
  image_hash text not null,
  max_retries integer not null default 2 check (max_retries >= 0 and max_retries <= 10),
  retry_count integer not null default 0 check (retry_count >= 0),
  status text not null default 'active' check (status in ('active', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_generation_attempts (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.api_generation_cycles(id) on delete cascade,
  api_key text not null,
  attempt_type text not null check (attempt_type in ('paid', 'retry')),
  status text not null default 'reserved' check (status in ('reserved', 'succeeded', 'failed')),
  reserved_credit boolean not null,
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.api_rate_limits (
  subject_hash text not null,
  action text not null,
  window_start timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (subject_hash, action)
);

create index if not exists api_generation_cycles_api_key_idx
  on public.api_generation_cycles(api_key, created_at desc);

create index if not exists api_generation_cycles_lookup_idx
  on public.api_generation_cycles(api_key, preset_id, image_hash);

create index if not exists api_generation_attempts_cycle_idx
  on public.api_generation_attempts(cycle_id, created_at desc);

alter table public.api_generation_cycles enable row level security;
alter table public.api_generation_attempts enable row level security;
alter table public.api_rate_limits enable row level security;

create or replace function public.reserve_paid_generation(
  p_api_key text,
  p_preset_id text,
  p_image_hash text,
  p_max_retries integer default 2
)
returns table (
  cycle_id uuid,
  attempt_id uuid,
  remaining_credits integer,
  retry_count integer,
  max_retries integer,
  is_retry boolean,
  is_new_cycle boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key record;
  v_cycle_id uuid;
  v_attempt_id uuid;
  v_max_retries integer := least(greatest(coalesce(p_max_retries, 2), 0), 10);
begin
  if p_api_key is null or btrim(p_api_key) = '' then
    raise exception 'invalid_key';
  end if;

  select credits, status, blocked_until
    into v_key
    from public.api_keys
   where key = p_api_key
   for update;

  if not found then
    raise exception 'invalid_key';
  end if;

  if v_key.status <> 'active' then
    raise exception 'key_revoked';
  end if;

  if v_key.blocked_until is not null and v_key.blocked_until > now() then
    raise exception 'blocked_until:%', v_key.blocked_until;
  end if;

  if coalesce(v_key.credits, 0) < 1 then
    raise exception 'no_credits';
  end if;

  update public.api_keys
     set credits = credits - 1
   where key = p_api_key
   returning credits into remaining_credits;

  insert into public.api_generation_cycles (
    api_key,
    preset_id,
    image_hash,
    max_retries,
    retry_count,
    status
  )
  values (
    p_api_key,
    p_preset_id,
    p_image_hash,
    v_max_retries,
    0,
    'active'
  )
  returning id into v_cycle_id;

  insert into public.api_generation_attempts (
    cycle_id,
    api_key,
    attempt_type,
    status,
    reserved_credit
  )
  values (
    v_cycle_id,
    p_api_key,
    'paid',
    'reserved',
    true
  )
  returning id into v_attempt_id;

  cycle_id := v_cycle_id;
  attempt_id := v_attempt_id;
  retry_count := 0;
  max_retries := v_max_retries;
  is_retry := false;
  is_new_cycle := true;
  return next;
end;
$$;

create or replace function public.reserve_retry_generation(
  p_api_key text,
  p_cycle_id uuid,
  p_preset_id text,
  p_image_hash text
)
returns table (
  cycle_id uuid,
  attempt_id uuid,
  remaining_credits integer,
  retry_count integer,
  max_retries integer,
  is_retry boolean,
  is_new_cycle boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key record;
  v_cycle record;
  v_attempt_id uuid;
begin
  select credits, status, blocked_until
    into v_key
    from public.api_keys
   where key = p_api_key
   for update;

  if not found then
    raise exception 'invalid_key';
  end if;

  if v_key.status <> 'active' then
    raise exception 'key_revoked';
  end if;

  if v_key.blocked_until is not null and v_key.blocked_until > now() then
    raise exception 'blocked_until:%', v_key.blocked_until;
  end if;

  select id, api_key, preset_id, image_hash, retry_count, max_retries, status
    into v_cycle
    from public.api_generation_cycles
   where id = p_cycle_id
   for update;

  if not found then
    raise exception 'cycle_not_found';
  end if;

  if v_cycle.api_key <> p_api_key
     or v_cycle.preset_id <> p_preset_id
     or v_cycle.image_hash <> p_image_hash then
    raise exception 'cycle_mismatch';
  end if;

  if v_cycle.status <> 'active' then
    raise exception 'cycle_closed';
  end if;

  if v_cycle.retry_count >= v_cycle.max_retries then
    raise exception 'retry_limit_exceeded';
  end if;

  update public.api_generation_cycles
     set retry_count = retry_count + 1,
         updated_at = now()
   where id = p_cycle_id
   returning api_generation_cycles.retry_count, api_generation_cycles.max_retries
    into retry_count, max_retries;

  insert into public.api_generation_attempts (
    cycle_id,
    api_key,
    attempt_type,
    status,
    reserved_credit
  )
  values (
    p_cycle_id,
    p_api_key,
    'retry',
    'reserved',
    false
  )
  returning id into v_attempt_id;

  cycle_id := p_cycle_id;
  attempt_id := v_attempt_id;
  remaining_credits := v_key.credits;
  is_retry := true;
  is_new_cycle := false;
  return next;
end;
$$;

create or replace function public.mark_generation_attempt_succeeded(
  p_attempt_id uuid
)
returns table (
  cycle_id uuid,
  remaining_credits integer,
  retry_count integer,
  max_retries integer,
  is_retry boolean,
  is_new_cycle boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_cycle record;
begin
  select *
    into v_attempt
    from public.api_generation_attempts
   where id = p_attempt_id
   for update;

  if not found then
    raise exception 'attempt_not_found';
  end if;

  select *
    into v_cycle
    from public.api_generation_cycles
   where id = v_attempt.cycle_id
   for update;

  if v_attempt.status = 'reserved' then
    update public.api_generation_attempts
       set status = 'succeeded',
           finished_at = now(),
           error_message = null
     where id = p_attempt_id;

    update public.api_keys
       set total_used = coalesce(total_used, 0) + 1,
           last_used = now(),
           consecutive_failures = 0,
           blocked_until = null
     where key = v_attempt.api_key;

    update public.api_generation_cycles
       set updated_at = now()
     where id = v_attempt.cycle_id;
  end if;

  select credits into remaining_credits
    from public.api_keys
   where key = v_attempt.api_key;

  cycle_id := v_attempt.cycle_id;
  retry_count := v_cycle.retry_count;
  max_retries := v_cycle.max_retries;
  is_retry := v_attempt.attempt_type = 'retry';
  is_new_cycle := v_attempt.attempt_type = 'paid';
  return next;
end;
$$;

create or replace function public.mark_generation_attempt_failed(
  p_attempt_id uuid,
  p_error_message text default null,
  p_failure_threshold integer default 2,
  p_block_minutes integer default 10
)
returns table (
  cycle_id uuid,
  remaining_credits integer,
  retry_count integer,
  max_retries integer,
  is_retry boolean,
  is_new_cycle boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_cycle record;
  v_failures integer;
begin
  select *
    into v_attempt
    from public.api_generation_attempts
   where id = p_attempt_id
   for update;

  if not found then
    raise exception 'attempt_not_found';
  end if;

  select *
    into v_cycle
    from public.api_generation_cycles
   where id = v_attempt.cycle_id
   for update;

  if v_attempt.status = 'reserved' then
    update public.api_generation_attempts
       set status = 'failed',
           finished_at = now(),
           error_message = left(p_error_message, 1000)
     where id = p_attempt_id;

    if v_attempt.reserved_credit then
      update public.api_keys
         set credits = credits + 1
       where key = v_attempt.api_key;
    elsif v_attempt.attempt_type = 'retry' and v_cycle.retry_count > 0 then
      update public.api_generation_cycles
         set retry_count = retry_count - 1,
             updated_at = now()
       where id = v_attempt.cycle_id
       returning api_generation_cycles.retry_count into v_cycle.retry_count;
    end if;

    update public.api_keys
       set consecutive_failures = coalesce(consecutive_failures, 0) + 1
     where key = v_attempt.api_key
     returning consecutive_failures into v_failures;

    if v_failures >= coalesce(p_failure_threshold, 2) then
      update public.api_keys
         set blocked_until = now() + make_interval(mins => coalesce(p_block_minutes, 10))
       where key = v_attempt.api_key;
    end if;
  end if;

  select credits into remaining_credits
    from public.api_keys
   where key = v_attempt.api_key;

  select retry_count, max_retries
    into retry_count, max_retries
    from public.api_generation_cycles
   where id = v_attempt.cycle_id;

  cycle_id := v_attempt.cycle_id;
  is_retry := v_attempt.attempt_type = 'retry';
  is_new_cycle := v_attempt.attempt_type = 'paid';
  return next;
end;
$$;

create or replace function public.record_generation_success(
  p_attempt_id uuid
)
returns table (
  cycle_id uuid,
  remaining_credits integer,
  retry_count integer,
  max_retries integer,
  is_retry boolean,
  is_new_cycle boolean
)
language sql
security definer
set search_path = public
as $$
  select * from public.mark_generation_attempt_succeeded(p_attempt_id);
$$;

create or replace function public.record_generation_failure(
  p_attempt_id uuid,
  p_error_message text default null
)
returns table (
  cycle_id uuid,
  remaining_credits integer,
  retry_count integer,
  max_retries integer,
  is_retry boolean,
  is_new_cycle boolean
)
language sql
security definer
set search_path = public
as $$
  select * from public.mark_generation_attempt_failed(p_attempt_id, p_error_message);
$$;

create or replace function public.consume_rate_limit(
  p_subject_hash text,
  p_action text default 'payment_submit',
  p_limit integer default 5,
  p_window_seconds integer default 3600
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
  v_now timestamptz := now();
  v_limit integer := greatest(coalesce(p_limit, 5), 1);
  v_window_seconds integer := greatest(coalesce(p_window_seconds, 3600), 1);
  v_window interval := make_interval(secs => greatest(coalesce(p_window_seconds, 3600), 1));
begin
  if p_subject_hash is null or btrim(p_subject_hash) = '' then
    raise exception 'invalid_rate_limit_subject';
  end if;

  select *
    into v_existing
    from public.api_rate_limits
   where subject_hash = p_subject_hash
     and action = p_action
   for update;

  if not found then
    insert into public.api_rate_limits (
      subject_hash,
      action,
      window_start,
      request_count,
      updated_at
    )
    values (
      p_subject_hash,
      p_action,
      v_now,
      1,
      v_now
    );

    allowed := true;
    remaining := v_limit - 1;
    reset_at := v_now + v_window;
    return next;
    return;
  end if;

  if v_existing.window_start + v_window <= v_now then
    update public.api_rate_limits
       set window_start = v_now,
           request_count = 1,
           updated_at = v_now
     where subject_hash = p_subject_hash
       and action = p_action;

    allowed := true;
    remaining := v_limit - 1;
    reset_at := v_now + v_window;
    return next;
    return;
  end if;

  reset_at := v_existing.window_start + v_window;

  if v_existing.request_count >= v_limit then
    allowed := false;
    remaining := 0;
    return next;
    return;
  end if;

  update public.api_rate_limits
     set request_count = request_count + 1,
         updated_at = v_now
   where subject_hash = p_subject_hash
     and action = p_action
   returning greatest(v_limit - request_count, 0)
    into remaining;

  allowed := true;
  return next;
end;
$$;

revoke all on function public.reserve_paid_generation(text, text, text, integer) from public, anon, authenticated;
revoke all on function public.reserve_retry_generation(text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.mark_generation_attempt_succeeded(uuid) from public, anon, authenticated;
revoke all on function public.mark_generation_attempt_failed(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.record_generation_success(uuid) from public, anon, authenticated;
revoke all on function public.record_generation_failure(uuid, text) from public, anon, authenticated;
revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;

grant execute on function public.reserve_paid_generation(text, text, text, integer) to service_role;
grant execute on function public.reserve_retry_generation(text, uuid, text, text) to service_role;
grant execute on function public.mark_generation_attempt_succeeded(uuid) to service_role;
grant execute on function public.mark_generation_attempt_failed(uuid, text, integer, integer) to service_role;
grant execute on function public.record_generation_success(uuid) to service_role;
grant execute on function public.record_generation_failure(uuid, text) to service_role;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
