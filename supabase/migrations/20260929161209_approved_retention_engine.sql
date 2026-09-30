-- Retention is deliberately not scheduled here. Operators must verify the first
-- Production dry run and separately enable a privileged scheduler.
create schema retention;
revoke all on schema retention from public, anon, authenticated;
grant usage on schema retention to service_role;

-- Preserve the historical 180-day operational marker. No application reader or
-- cleanup currently acts on it. Retention is a separate 24-month group rule.
create index analytics_consent_evidence_time_idx
  on public.analytics_consent_evidence (occurred_at, visitor_id);

-- A session ends at its existing inactivity deadline (last activity + 30 min).
-- No invented historical end timestamp is backfilled.
create index analytics_sessions_v2_retention_idx
  on public.analytics_sessions_v2 (expires_at, session_id);
create index analytics_cookieless_events_retention_idx
  on public.analytics_cookieless_events (occurred_at);
create index analytics_quality_exceptions_retention_idx
  on public.analytics_quality_exceptions (occurred_at);
create index admin_invitations_retention_idx
  on public.admin_invitations (status, expires_at, accepted_at, revoked_at, last_attempt_at);

-- Acquisition has a separate lifetime from the visitor identity. Historical
-- rows use first_seen_at / started_at as conservative lower-bound timestamps.
alter table public.analytics_visitors add column first_acquisition_at timestamptz;
update public.analytics_visitors
set first_acquisition_at = first_seen_at
where first_acquisition <> '{}'::jsonb;
alter table public.analytics_sessions_v2
  add column session_acquisition_at timestamptz,
  add column current_attribution_at timestamptz;
update public.analytics_sessions_v2
set session_acquisition_at = case when session_acquisition <> '{}'::jsonb then started_at end,
    current_attribution_at = case when current_attribution <> '{}'::jsonb then last_seen_at end;

-- The correctness-freeze trigger preserves the first session acquisition on
-- ordinary ingest updates. A privileged retention scrub must be its one narrow
-- exception; otherwise the old value is restored before the purge can persist.
create or replace function public.preserve_session_acquisition_v1()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user = 'postgres'
     and new.session_acquisition = '{}'::jsonb
     and new.session_acquisition_at < clock_timestamp() - interval '12 months' then
    return new;
  end if;
  if nullif(old.session_acquisition->>'trackingLinkId', '') is not null then
    new.session_acquisition := old.session_acquisition;
  elsif nullif(new.current_attribution->>'trackingLinkId', '') is not null then
    new.session_acquisition := new.current_attribution;
  elsif coalesce(old.session_acquisition->>'source', 'direct') <> 'direct' then
    new.session_acquisition := old.session_acquisition;
  elsif coalesce(new.session_acquisition->>'source', 'direct') = 'direct' then
    new.session_acquisition := old.session_acquisition;
  end if;
  return new;
end;
$$;

create function retention.stamp_attribution()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_table_name = 'analytics_visitors' then
    if tg_op = 'INSERT' then
      if new.first_acquisition <> '{}'::jsonb then
        new.first_acquisition_at := coalesce(new.first_acquisition_at, new.first_seen_at);
      end if;
    elsif new.first_acquisition is distinct from old.first_acquisition then
      if new.first_acquisition <> '{}'::jsonb then
        if old.first_acquisition = '{}'::jsonb and old.first_acquisition_at is not null then
          -- An expired first touch must not be silently recreated on later activity.
          new.first_acquisition := '{}'::jsonb;
        else
          new.first_acquisition_at := clock_timestamp();
        end if;
      end if;
    end if;
  elsif tg_table_name = 'analytics_sessions_v2' then
    if tg_op = 'INSERT' then
      if new.session_acquisition <> '{}'::jsonb then
        new.session_acquisition_at := coalesce(new.session_acquisition_at, new.started_at);
      end if;
      if new.current_attribution <> '{}'::jsonb then
        new.current_attribution_at := coalesce(new.current_attribution_at, new.started_at);
      end if;
    else
      if new.session_acquisition is distinct from old.session_acquisition
         and new.session_acquisition <> '{}'::jsonb then
        if old.session_acquisition = '{}'::jsonb and old.session_acquisition_at is not null then
          new.session_acquisition := '{}'::jsonb;
        else
          new.session_acquisition_at := clock_timestamp();
        end if;
      end if;
      if new.current_attribution is distinct from old.current_attribution
         and new.current_attribution <> '{}'::jsonb then
        new.current_attribution_at := clock_timestamp();
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger retention_stamp_visitor before insert or update of first_acquisition
  on public.analytics_visitors for each row execute function retention.stamp_attribution();
create trigger retention_stamp_session before insert or update of session_acquisition, current_attribution
  on public.analytics_sessions_v2 for each row execute function retention.stamp_attribution();

-- Expiry validity and the transition to expired are different moments. Existing
-- expired rows use updated_at as a conservative transition bound; new rows get
-- an explicit timestamp. Pending rows are never purged by age alone.
alter table public.admin_invitations add column expired_at timestamptz;
update public.admin_invitations set expired_at = updated_at where status = 'expired';
create function retention.stamp_invitation_expiry()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'expired' and old.status is distinct from 'expired' then
    new.expired_at := clock_timestamp();
  end if;
  return new;
end;
$$;
create trigger retention_stamp_invitation_expiry before update of status
  on public.admin_invitations for each row execute function retention.stamp_invitation_expiry();

-- Invitation rows have their own approved lifecycle. Keep the inviter UUID as
-- a historical snapshot rather than blocking privileged Auth-user deletion.
-- Existing admin RPC checks still compare against that UUID, so a different
-- admin does not gain control of the invitation after the inviter is removed.
alter table public.admin_invitations drop constraint admin_invitations_invited_by_fkey;
-- A later acceptance must not resurrect a missing Auth FK in admin_profiles.
create function retention.null_missing_profile_inviter()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.invited_by is not null and not exists
     (select 1 from auth.users where id = new.invited_by) then
    new.invited_by := null;
  end if;
  return new;
end;
$$;
create trigger retention_null_missing_profile_inviter before insert or update of invited_by
  on public.admin_profiles for each row execute function retention.null_missing_profile_inviter();

-- This row is intentionally absent on migration. Only a separately reviewed
-- operator action can start the legacy 90-day clock.
create table retention.legacy_migration_gate (
  singleton boolean primary key default true check (singleton),
  migration_verified_at timestamptz not null,
  app_paths_clear boolean not null check (app_paths_clear),
  reporting_clear boolean not null check (reporting_clear),
  rollback_closed boolean not null check (rollback_closed),
  evidence_reference text not null check (length(btrim(evidence_reference)) between 8 and 200)
);
create table retention.purge_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default clock_timestamp(),
  as_of timestamptz not null,
  batch_size integer not null,
  counts jsonb not null
);
revoke all on all tables in schema retention from public, anon, authenticated, service_role;

create function retention.run(
  p_as_of timestamptz default clock_timestamp(),
  p_batch_size integer default 500,
  p_dry_run boolean default true
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_counts jsonb := '{}'::jsonb;
  v_count integer;
  v_legacy boolean;
  v_legacy_verified_at timestamptz;
  v_run_id uuid;
  v_quality_columns text[];
  v_empty_sessions uuid[];
  v_empty_legacy_sessions uuid[];
begin
  if p_as_of is null or p_as_of > clock_timestamp()
     or p_batch_size is null or p_batch_size not between 1 and 1000
     or p_dry_run is null then
    raise exception 'invalid_retention_request' using errcode = '22023';
  end if;
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended('pozanuta.retention.run', 0)) then
    raise exception 'retention_run_busy' using errcode = '55P03';
  end if;

  -- Fail closed if the aggregate table gains identifying dimensions or a
  -- writer starts placing arbitrary route values in it.
  select pg_catalog.array_agg(a.attname order by a.attname) into v_quality_columns
  from pg_catalog.pg_attribute a
  where a.attrelid = 'public.analytics_quality_daily'::pg_catalog.regclass
    and a.attnum > 0 and not a.attisdropped;
  if v_quality_columns is distinct from array['environment','metric_date','metric_name','route','updated_at','value']::text[]
     or exists (select 1 from public.analytics_quality_daily where route <> 'ingest') then
    raise exception 'quality_daily_requires_review' using errcode = '55000';
  end if;

  select migration_verified_at into v_legacy_verified_at
  from retention.legacy_migration_gate
  where migration_verified_at < p_as_of - interval '90 days'
    and app_paths_clear and reporting_clear and rollback_closed;
  v_legacy := found;
  if v_legacy and (
    exists (select 1 from public.analytics_events where created_at > v_legacy_verified_at)
    or exists (select 1 from public.analytics_sessions where last_seen_at > v_legacy_verified_at)
  ) then
    raise exception 'legacy_activity_after_verification' using errcode = '55000';
  end if;

  if p_dry_run then
    select count(*) into v_count from public.analytics_cookieless_events where occurred_at < p_as_of - interval '90 days';
    v_counts := v_counts || pg_catalog.jsonb_build_object('cookieless_events', v_count);
    select count(*) into v_count from public.analytics_events_v2 where occurred_at < p_as_of - interval '12 months';
    v_counts := v_counts || pg_catalog.jsonb_build_object('raw_events', v_count);
    select count(*) into v_count from public.analytics_quality_exceptions where occurred_at < p_as_of - interval '30 days';
    v_counts := v_counts || pg_catalog.jsonb_build_object('quality_exceptions', v_count);
    select count(*) into v_count from public.analytics_quality_daily where metric_date < (p_as_of at time zone 'UTC' - interval '24 months')::date;
    v_counts := v_counts || pg_catalog.jsonb_build_object('quality_daily', v_count);
    select count(*) into v_count from public.audit_log where created_at < p_as_of - interval '24 months';
    v_counts := v_counts || pg_catalog.jsonb_build_object('admin_audit', v_count);
    select count(*) into v_count from public.analytics_consent_evidence e
    where e.occurred_at < p_as_of - interval '24 months'
      and not exists (select 1 from public.analytics_consent_evidence later
        where later.visitor_id = e.visitor_id and later.occurred_at >= p_as_of - interval '24 months');
    v_counts := v_counts || pg_catalog.jsonb_build_object('consent_evidence', v_count);
    select count(*) into v_count from public.analytics_visitors v
    where v.first_acquisition <> '{}'::jsonb and v.first_acquisition_at < p_as_of - interval '12 months';
    v_counts := v_counts || pg_catalog.jsonb_build_object('visitor_acquisition', v_count);
    select count(*) into v_count from public.analytics_sessions_v2 s
    where s.session_acquisition <> '{}'::jsonb and s.session_acquisition_at < p_as_of - interval '12 months';
    v_counts := v_counts || pg_catalog.jsonb_build_object('session_acquisition', v_count);
    select count(*) into v_count from public.analytics_sessions_v2 s
    where s.current_attribution <> '{}'::jsonb and s.current_attribution_at < p_as_of - interval '12 months';
    v_counts := v_counts || pg_catalog.jsonb_build_object('current_attribution', v_count);
    select count(*) into v_count from public.admin_invitations
    where status = 'pending' and expires_at < p_as_of;
    v_counts := v_counts || pg_catalog.jsonb_build_object('pending_to_expire', v_count);
    select count(*) into v_count from public.admin_invitations
    where (status = 'accepted' and accepted_at < p_as_of - interval '90 days')
       or (status = 'revoked' and revoked_at < p_as_of - interval '90 days')
       or (status = 'expired' and expired_at < p_as_of - interval '90 days')
       or (status = 'failed' and last_attempt_at < p_as_of - interval '90 days');
    v_counts := v_counts || pg_catalog.jsonb_build_object('admin_invitations', v_count);
    select count(*) into v_count from public.analytics_sessions_v2 s
    where s.expires_at < p_as_of - interval '12 months'
      and not exists (select 1 from public.analytics_events_v2 e where e.session_id = s.session_id);
    v_counts := v_counts || pg_catalog.jsonb_build_object('empty_sessions', v_count);
    select count(*) into v_count from public.analytics_visitors v
    where v.last_seen_at < p_as_of - interval '12 months'
      and not exists (select 1 from public.analytics_sessions_v2 s where s.visitor_id = v.visitor_id and s.last_seen_at >= p_as_of - interval '12 months')
      and not exists (select 1 from public.analytics_events_v2 e where e.visitor_id = v.visitor_id and e.occurred_at >= p_as_of - interval '12 months')
      and not exists (select 1 from public.analytics_consent_evidence c where c.visitor_id = v.visitor_id and c.occurred_at >= p_as_of - interval '12 months');
    v_counts := v_counts || pg_catalog.jsonb_build_object('visitors', v_count);
    select count(*) into v_count from public.admin_profiles
    where status = 'inactive' and deactivated_at < p_as_of - interval '30 days';
    v_counts := v_counts || pg_catalog.jsonb_build_object('auth_manual_candidates', v_count);
    if v_legacy then
      select count(*) into v_count from public.analytics_events;
      v_counts := v_counts || pg_catalog.jsonb_build_object('legacy_events', v_count);
      select count(*) into v_count from public.analytics_sessions s
      where not exists (select 1 from public.analytics_events e where e.visit_id = s.visit_id);
      v_counts := v_counts || pg_catalog.jsonb_build_object('legacy_sessions', v_count);
    else
      v_counts := v_counts || '{"legacy_events":0,"legacy_sessions":0}'::jsonb;
    end if;
    return pg_catalog.jsonb_build_object('dryRun', true, 'asOf', p_as_of, 'eligible', v_counts, 'legacyGateOpen', v_legacy);
  end if;

  -- Lock only sessions that were already empty at run start. Rows made empty
  -- by this batch of event deletion are handled by the next invocation; this
  -- makes pre-run diagnostics and the dependency boundary deterministic.
  select pg_catalog.array_agg(session_id) into v_empty_sessions from (
    select s.session_id from public.analytics_sessions_v2 s
    where s.expires_at < p_as_of - interval '12 months'
      and not exists (select 1 from public.analytics_events_v2 e where e.session_id = s.session_id)
    order by s.expires_at,s.session_id limit p_batch_size for update of s skip locked
  ) eligible;
  if v_legacy then
    select pg_catalog.array_agg(visit_id) into v_empty_legacy_sessions from (
      select s.visit_id from public.analytics_sessions s
      where not exists (select 1 from public.analytics_events e where e.visit_id = s.visit_id)
      order by s.visit_id limit p_batch_size for update of s skip locked
    ) eligible;
  end if;

  with batch as (select event_id from public.analytics_cookieless_events
    where occurred_at < p_as_of - interval '90 days' order by occurred_at, event_id limit p_batch_size for update skip locked)
  delete from public.analytics_cookieless_events e using batch b where e.event_id = b.event_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('cookieless_events', v_count);

  with batch as (select id from public.analytics_events_v2
    where occurred_at < p_as_of - interval '12 months' order by occurred_at, id limit p_batch_size for update skip locked)
  delete from public.analytics_events_v2 e using batch b where e.id = b.id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('raw_events', v_count);

  with batch as (select id from public.analytics_quality_exceptions
    where occurred_at < p_as_of - interval '30 days' order by occurred_at, id limit p_batch_size for update skip locked)
  delete from public.analytics_quality_exceptions e using batch b where e.id = b.id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('quality_exceptions', v_count);

  with batch as (select metric_date, environment, metric_name, route from public.analytics_quality_daily
    where metric_date < (p_as_of at time zone 'UTC' - interval '24 months')::date
    order by metric_date, environment, metric_name, route limit p_batch_size for update skip locked)
  delete from public.analytics_quality_daily e using batch b
  where (e.metric_date,e.environment,e.metric_name,e.route)=(b.metric_date,b.environment,b.metric_name,b.route);
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('quality_daily', v_count);

  with batch as (select id from public.audit_log
    where created_at < p_as_of - interval '24 months' order by created_at,id limit p_batch_size for update skip locked)
  delete from public.audit_log e using batch b where e.id = b.id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('admin_audit', v_count);

  with batch as (select e.id from public.analytics_consent_evidence e
    where e.occurred_at < p_as_of - interval '24 months'
      and not exists (select 1 from public.analytics_consent_evidence later
        where later.visitor_id = e.visitor_id and later.occurred_at >= p_as_of - interval '24 months')
    order by e.occurred_at,e.id limit p_batch_size for update of e skip locked)
  delete from public.analytics_consent_evidence e using batch b where e.id = b.id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('consent_evidence', v_count);

  with batch as (select visitor_id from public.analytics_visitors
    where first_acquisition <> '{}'::jsonb and first_acquisition_at < p_as_of - interval '12 months'
    order by first_acquisition_at,visitor_id limit p_batch_size for update skip locked)
  update public.analytics_visitors v set first_acquisition = '{}'::jsonb
  from batch b where v.visitor_id = b.visitor_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('visitor_acquisition', v_count);

  with batch as (select session_id from public.analytics_sessions_v2
    where session_acquisition <> '{}'::jsonb and session_acquisition_at < p_as_of - interval '12 months'
    order by session_acquisition_at,session_id limit p_batch_size for update skip locked)
  update public.analytics_sessions_v2 s set session_acquisition = '{}'::jsonb
  from batch b where s.session_id = b.session_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('session_acquisition', v_count);

  with batch as (select session_id from public.analytics_sessions_v2
    where current_attribution <> '{}'::jsonb and current_attribution_at < p_as_of - interval '12 months'
    order by current_attribution_at,session_id limit p_batch_size for update skip locked)
  update public.analytics_sessions_v2 s set current_attribution = '{}'::jsonb
  from batch b where s.session_id = b.session_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('current_attribution', v_count);

  with batch as (select id from public.admin_invitations
    where status = 'pending' and expires_at < p_as_of
    order by expires_at,id limit p_batch_size for update skip locked)
  update public.admin_invitations i set status = 'expired'
  from batch b where i.id = b.id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('pending_to_expire', v_count);

  with batch as (select id from public.admin_invitations
    where (status = 'accepted' and accepted_at < p_as_of - interval '90 days')
       or (status = 'revoked' and revoked_at < p_as_of - interval '90 days')
       or (status = 'expired' and expired_at < p_as_of - interval '90 days')
       or (status = 'failed' and last_attempt_at < p_as_of - interval '90 days')
    order by id limit p_batch_size for update skip locked)
  delete from public.admin_invitations i using batch b where i.id = b.id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('admin_invitations', v_count);

  delete from public.analytics_sessions_v2 s
  where s.session_id = any(coalesce(v_empty_sessions, '{}'::uuid[]))
    and not exists (select 1 from public.analytics_events_v2 e where e.session_id = s.session_id);
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('empty_sessions', v_count);

  with batch as (select v.visitor_id from public.analytics_visitors v
    where v.last_seen_at < p_as_of - interval '12 months'
      and not exists (select 1 from public.analytics_sessions_v2 s where s.visitor_id = v.visitor_id and s.last_seen_at >= p_as_of - interval '12 months')
      and not exists (select 1 from public.analytics_events_v2 e where e.visitor_id = v.visitor_id and e.occurred_at >= p_as_of - interval '12 months')
      and not exists (select 1 from public.analytics_consent_evidence c where c.visitor_id = v.visitor_id and c.occurred_at >= p_as_of - interval '12 months')
    order by v.last_seen_at,v.visitor_id limit p_batch_size for update of v skip locked)
  delete from public.analytics_visitors v using batch b where v.visitor_id = b.visitor_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('visitors', v_count);

  if v_legacy then
    with batch as (select id from public.analytics_events order by id limit p_batch_size for update skip locked)
    delete from public.analytics_events e using batch b where e.id = b.id;
    get diagnostics v_count = row_count;
    v_counts := v_counts || pg_catalog.jsonb_build_object('legacy_events', v_count);
    delete from public.analytics_sessions s
    where s.visit_id = any(coalesce(v_empty_legacy_sessions, '{}'::uuid[]))
      and not exists (select 1 from public.analytics_events e where e.visit_id = s.visit_id);
    get diagnostics v_count = row_count;
    v_counts := v_counts || pg_catalog.jsonb_build_object('legacy_sessions', v_count);
  else
    v_counts := v_counts || '{"legacy_events":0,"legacy_sessions":0}'::jsonb;
  end if;

  select count(*) into v_count from public.admin_profiles
  where status = 'inactive' and deactivated_at < p_as_of - interval '30 days';
  v_counts := v_counts || pg_catalog.jsonb_build_object('auth_manual_candidates', v_count);
  insert into retention.purge_runs(as_of,batch_size,counts)
  values (p_as_of,p_batch_size,v_counts) returning id into v_run_id;
  return pg_catalog.jsonb_build_object('dryRun',false,'runId',v_run_id,'asOf',p_as_of,'deletedOrScrubbed',v_counts,'legacyGateOpen',v_legacy);
end;
$$;

revoke all on function retention.stamp_attribution() from public, anon, authenticated, service_role;
revoke all on function retention.stamp_invitation_expiry() from public, anon, authenticated, service_role;
revoke all on function retention.null_missing_profile_inviter() from public, anon, authenticated, service_role;
revoke all on function retention.run(timestamptz,integer,boolean) from public, anon, authenticated;
grant execute on function retention.run(timestamptz,integer,boolean) to service_role;
