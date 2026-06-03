-- ArchDraw Intel — P1-A: server-authoritative quota / billing hardening
-- ═════════════════════════════════════════════════════════════════════════
-- ⚠ DRAFT — REVIEW BEFORE APPLYING. Not yet run against the live project
--   (jfiafdeppfsksxrzqumw). Apply only after sign-off, via the Supabase SQL
--   editor or the migration runner. Wrapped in a transaction so a failure
--   rolls back cleanly.
--
-- Closes AUDIT.md #5,#6,#7,#8 (+#9,#10,#11) and the live security-advisor
-- findings (function_search_path_mutable; anon/authenticated-executable
-- SECURITY DEFINER functions).
--
-- ── Trust boundary AFTER this migration ──────────────────────────────────
--   profiles.plan / trial_used / stripe_*  → writable ONLY by service-role
--       (Stripe webhook / admin). Client may update display_name and nothing
--       else (column-level GRANT).
--   analyses rows                          → created & closed ONLY through the
--       quota-gated SECURITY DEFINER RPCs below. Client has SELECT only.
--   quota count                            → completed-in-window + recent
--       running, over rows the client can no longer forge or backdate.
--   concurrency                            → reserve_analysis() serializes per
--       user via FOR UPDATE on the profile row → no race double-spend.
--
-- The Edge Function (api/ai/[...path].js) is the OTHER half of this change
-- (see P1A_DESIGN.md §4); it must be deployed together with this migration.

begin;

-- ── 1. profiles: client may SELECT, and UPDATE display_name ONLY ─────────
-- REVOKE ALL first: the live grant set included more than SELECT/UPDATE (out-
-- of-band `grant all`), so revoke everything then re-grant the minimum.
revoke all on public.profiles from authenticated;
grant  select on public.profiles to authenticated;
grant  update (display_name) on public.profiles to authenticated;

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── 2. analyses: client is READ-ONLY; lifecycle moves to the RPCs ────────
-- REVOKE ALL clears the stray DELETE/TRIGGER/TRUNCATE/REFERENCES grants seen
-- live; re-grant only SELECT so the UI can show history.
revoke all on public.analyses from authenticated;
grant  select on public.analyses to authenticated;
drop policy if exists "analyses self insert" on public.analyses;
drop policy if exists "analyses self update" on public.analyses;
-- "analyses self read" (SELECT) policy is retained.

-- ── 3. quota counting: completed-in-window + in-flight running ───────────
-- Counting recent 'running' rows blocks the "start N analyses at once" bypass;
-- the 30-minute TTL stops a crashed/abandoned run from counting forever.
-- ⚑ WINDOW SEMANTICS (owner decision): this keeps the existing rolling-30-day
--   window. To bill on the calendar/plan period instead, swap the completed_at
--   predicate for `>= date_trunc('month', now())` or `>= profiles.plan_renews_at
--   - interval '1 month'`. See P1A_DESIGN.md §6.
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
    and (
      (a.status = 'completed'
        and ((select plan from public.profiles where id = uid) = 'trial'
             or a.completed_at >= now() - interval '30 days'))
      or (a.status = 'running' and a.started_at >= now() - interval '30 minutes')
    );
$$;

-- plan_quota: add the missing search_path (advisor: function_search_path_mutable)
create or replace function public.plan_quota(p text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p when 'trial' then 1 when 'pro' then 50 when 'team' then 250 else 0 end;
$$;

-- ── 4. reserve_analysis(): atomic quota-check + insert — the gate ────────
-- Called by the CLIENT with its JWT (auth.uid()). SECURITY DEFINER so it can
-- insert into analyses even though the client's direct INSERT was revoked.
-- Returns the new analysis id, or raises 'quota_exceeded'.
create or replace function public.reserve_analysis(
  p_address      text,
  p_jurisdiction text default null,
  p_state        text default null,
  p_zoning       text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_plan  text;
  v_quota integer;
  v_used  integer;
  v_id    uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  -- Serialize concurrent reservations for this user (lock the profile row).
  select plan into v_plan from public.profiles where id = v_uid for update;
  v_plan  := coalesce(v_plan, 'trial');
  v_quota := public.plan_quota(v_plan);
  v_used  := public.current_period_usage(v_uid);
  if v_used >= v_quota then
    raise exception 'quota_exceeded'
      using detail = v_used::text || '/' || v_quota::text, errcode = 'P0001';
  end if;
  insert into public.analyses
    (user_id, address, jurisdiction, state, zoning_district, plan_at_time, status)
  values
    (v_uid, coalesce(p_address, ''), p_jurisdiction, p_state, p_zoning, v_plan, 'running')
  returning id into v_id;
  return v_id;
end;
$$;

-- ── 5. complete_analysis(): server sets status + completed_at = now() ────
-- The client can only flip its OWN 'running' row, and cannot supply the
-- timestamp (set server-side → no clock tampering / backdating).
create or replace function public.complete_analysis(
  p_id     uuid,
  p_status text default 'completed',
  p_error  text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  update public.analyses
     set status        = case when p_status in ('completed','failed','cancelled')
                              then p_status else 'completed' end,
         completed_at  = now(),
         error_message = left(p_error, 500)
   where id = p_id and user_id = v_uid and status = 'running';
end;
$$;

-- ── 6. has_active_analysis(): the Edge AI endpoint's per-message gate ────
-- A /api/ai/messages call is allowed only while the user holds a fresh
-- reserved 'running' analysis — the reservation already accounted for quota,
-- so individual messages within it are not separately metered. Called by the
-- Edge Function via service-role.
create or replace function public.has_active_analysis(uid uuid, aid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.analyses
    where id = aid and user_id = uid and status = 'running'
      and started_at >= now() - interval '30 minutes'
  );
$$;

-- ── 7. lock down function EXECUTE (advisors 0028 / 0029) ─────────────────
-- Functions grant EXECUTE to PUBLIC by default — that (not a grant to anon/
-- authenticated) plus Supabase's default-privilege grants to anon/authenticated
-- AND the explicit 0001 grants — so revoke from all three to truly lock these
-- down. service_role keeps access via the explicit grants below. (Verified by
-- dry-run: revoking from PUBLIC alone left anon/authenticated EXECUTE intact.)
revoke all on function public.handle_new_user()                     from public, anon, authenticated;
revoke all on function public.current_period_usage(uuid)            from public, anon, authenticated;
revoke all on function public.can_run_analysis(uuid)                from public, anon, authenticated;
revoke all on function public.plan_quota(text)                      from public, anon, authenticated;
revoke all on function public.has_active_analysis(uuid,uuid)        from public, anon, authenticated;
revoke all on function public.reserve_analysis(text,text,text,text) from public, anon, authenticated;
revoke all on function public.complete_analysis(uuid,text,text)     from public, anon, authenticated;

-- rls_auto_enable() exists on the live project but is not in 0001 (added out of
-- band). Revoke defensively only if present, so this migration also runs on a
-- fresh DB that never had it.
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- The two client-facing RPCs are called with the user's JWT:
grant execute on function public.reserve_analysis(text,text,text,text) to authenticated;
grant execute on function public.complete_analysis(uuid,text,text)     to authenticated;

-- Functions the Edge Function calls via service-role:
grant execute on function public.has_active_analysis(uuid,uuid) to service_role;
grant execute on function public.current_period_usage(uuid)     to service_role;
grant execute on function public.plan_quota(text)               to service_role;

commit;

-- ── Post-apply (NOT SQL — do in the dashboard) ───────────────────────────
-- • Auth → Providers → enable "Leaked password protection" (HaveIBeenPwned).
--   (Advisor: auth_leaked_password_protection.)
-- • Deploy the matching api/ai/[...path].js + lib/proxy.js changes
--   (P1A_DESIGN.md §4–§5) in the SAME release as this migration.
