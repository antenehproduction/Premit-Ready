-- ArchDraw Intel — P0-1 hosted-key authentication schema
-- ─────────────────────────────────────────────────────────
-- Tables:
--   profiles       1-row-per-user metadata (mirrors auth.users.id)
--   analyses       1-row-per-pipeline-run audit trail
--   usage_events   metering events (per-call) for billing + quota
--
-- Plans:
--   trial   1 analysis lifetime  (default for new sign-ups)
--   pro     50 analyses / 30 days
--   team    250 analyses / 30 days
--
-- Quota is enforced by the Edge Function via current_period_usage(uid)
-- before any AI call hits Anthropic. RLS keeps users from reading
-- anyone else's rows; service-role bypasses RLS for the edge fn.

-- ── Extensions ────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  display_name    text,
  plan            text not null default 'trial',
  plan_renews_at  timestamptz,
  stripe_customer_id text,
  trial_used      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists profiles_plan_idx on public.profiles(plan);

-- Auto-create a profile when a user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── analyses ──────────────────────────────────────────────
create table if not exists public.analyses (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  address       text not null,
  jurisdiction  text,
  state         text,
  zoning_district text,
  plan_at_time  text not null,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  status        text not null default 'running',
  error_message text,
  metadata      jsonb not null default '{}'::jsonb
);

create index if not exists analyses_user_started_idx
  on public.analyses(user_id, started_at desc);

-- ── usage_events ──────────────────────────────────────────
create table if not exists public.usage_events (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  analysis_id  uuid references public.analyses(id) on delete set null,
  event_type   text not null,
  occurred_at  timestamptz not null default now(),
  tokens_in    integer,
  tokens_out   integer,
  model        text,
  ms_elapsed   integer,
  metadata     jsonb not null default '{}'::jsonb
);

create index if not exists usage_events_user_time_idx
  on public.usage_events(user_id, occurred_at desc);

create index if not exists usage_events_user_type_idx
  on public.usage_events(user_id, event_type);

-- ── current_period_usage(uid) ─────────────────────────────
-- Returns count of completed analyses inside the current 30-day window
-- for paid plans, OR lifetime count for the trial plan.
create or replace function public.current_period_usage(uid uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.analyses a
  where a.user_id = uid
    and a.status = 'completed'
    and (
      (select plan from public.profiles where id = uid) = 'trial'
      or a.completed_at >= now() - interval '30 days'
    );
$$;

create or replace function public.plan_quota(p text)
returns integer
language sql
immutable
as $$
  select case p
    when 'trial' then 1
    when 'pro'   then 50
    when 'team'  then 250
    else 0
  end;
$$;

create or replace function public.can_run_analysis(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_period_usage(uid)
       < public.plan_quota((select plan from public.profiles where id = uid));
$$;

-- ── RLS ───────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.analyses      enable row level security;
alter table public.usage_events  enable row level security;

-- profiles: user reads + updates own row
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- analyses: user reads + inserts own rows; updates only their own
drop policy if exists "analyses self read" on public.analyses;
create policy "analyses self read" on public.analyses
  for select using (auth.uid() = user_id);

drop policy if exists "analyses self insert" on public.analyses;
create policy "analyses self insert" on public.analyses
  for insert with check (auth.uid() = user_id);

drop policy if exists "analyses self update" on public.analyses;
create policy "analyses self update" on public.analyses
  for update using (auth.uid() = user_id);

-- usage_events: user reads own; writes only via service-role (edge fn)
drop policy if exists "usage_events self read" on public.usage_events;
create policy "usage_events self read" on public.usage_events
  for select using (auth.uid() = user_id);

-- No insert/update policy for clients — only service-role writes usage_events.

-- ── Permissions ───────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.analyses to authenticated;
grant select on public.usage_events to authenticated;
grant execute on function public.current_period_usage(uuid) to authenticated;
grant execute on function public.plan_quota(text)            to authenticated, anon;
grant execute on function public.can_run_analysis(uuid)      to authenticated;
