-- Public page identities are mirrored in src/lib/public-paths.ts and checked by
-- src/lib/analytics-path-contract.test.ts. Referral landing paths remain separate.
create or replace function public.analytics_valid_event_path_v1(p_path text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_path in ('/','/karaoke-trojmiasto','/dla-lokali','/kontakt','/linki','/privacy','/cookies')
    or p_path ~ '^/(r|go)/[A-Za-z0-9_-]{1,80}$';
$$;

revoke all on function public.analytics_valid_event_path_v1(text) from public, anon, authenticated;
grant execute on function public.analytics_valid_event_path_v1(text) to service_role;

alter table public.analytics_events_v2 drop constraint analytics_events_v2_path_check;
alter table public.analytics_events_v2
  add constraint analytics_events_v2_path_check
  check (public.analytics_valid_event_path_v1(path)) not valid;
alter table public.analytics_events_v2 validate constraint analytics_events_v2_path_check;

create or replace function public.analytics_ingest_event_v1(
  p_event_id uuid,
  p_event_name text,
  p_session_id uuid,
  p_visitor_id uuid,
  p_environment text,
  p_traffic_class text,
  p_analytics_consent boolean,
  p_marketing_consent boolean,
  p_path text,
  p_observed_context jsonb,
  p_attributed_context jsonb,
  p_dimension_snapshots jsonb,
  p_tracking_link_id uuid,
  p_destination_id uuid,
  p_destination_slug text,
  p_device_type text,
  p_browser_family text,
  p_os_family text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sequence integer;
  v_session_acquisition jsonb;
  v_current_attribution jsonb;
  v_existing record;
begin
  if p_event_name not in ('tracking_entry','page_view','outbound_click','contact_view','contact_click','hub_resumed') then raise exception 'invalid_event_name'; end if;
  if p_environment not in ('production','staging','preview','development') then raise exception 'invalid_environment'; end if;
  if p_traffic_class not in ('external','internal','test','bot') then raise exception 'invalid_traffic_class'; end if;
  if not public.analytics_valid_event_path_v1(p_path) then raise exception 'invalid_path'; end if;
  if jsonb_typeof(p_observed_context) <> 'object' or octet_length(p_observed_context::text) > 4096 then raise exception 'invalid_observed_context'; end if;
  if jsonb_typeof(p_attributed_context) <> 'object' or octet_length(p_attributed_context::text) > 4096 then raise exception 'invalid_attributed_context'; end if;
  if jsonb_typeof(p_dimension_snapshots) <> 'object' or octet_length(p_dimension_snapshots::text) > 4096 then raise exception 'invalid_dimension_snapshots'; end if;
  if jsonb_typeof(p_metadata) <> 'object' or octet_length(p_metadata::text) > 8192 then raise exception 'invalid_metadata'; end if;
  if p_visitor_id is not null and not p_analytics_consent then raise exception 'visitor_requires_analytics_consent'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));
  select event_id, session_sequence into v_existing from public.analytics_events_v2 where event_id = p_event_id;
  if found then
    insert into public.analytics_quality_daily (metric_date, environment, metric_name, route, value)
    values ((now() at time zone 'Europe/Warsaw')::date, p_environment, 'duplicate_event', 'ingest', 1)
    on conflict (metric_date, environment, metric_name, route) do update set value = analytics_quality_daily.value + 1, updated_at = now();
    return jsonb_build_object('stored', true, 'duplicate', true, 'eventId', v_existing.event_id, 'sessionSequence', v_existing.session_sequence);
  end if;

  if p_visitor_id is not null then
    insert into public.analytics_visitors (visitor_id, first_acquisition, consent_version)
    values (p_visitor_id, '{}'::jsonb, 1)
    on conflict (visitor_id) do update
    set last_seen_at = greatest(analytics_visitors.last_seen_at, clock_timestamp());
  end if;

  insert into public.analytics_sessions_v2 (
    session_id, visitor_id, environment, traffic_class, analytics_consent, marketing_consent,
    session_acquisition, current_attribution, device_type, browser_family, os_family,
    next_sequence, last_seen_at, expires_at
  ) values (
    p_session_id, p_visitor_id, p_environment, p_traffic_class, p_analytics_consent, p_marketing_consent,
    p_attributed_context, p_attributed_context, p_device_type, p_browser_family, p_os_family,
    1, now(), now() + interval '30 minutes'
  )
  on conflict (session_id) do update set
    visitor_id = case when excluded.analytics_consent then coalesce(analytics_sessions_v2.visitor_id, excluded.visitor_id) else null end,
    environment = excluded.environment,
    traffic_class = excluded.traffic_class,
    analytics_consent = excluded.analytics_consent,
    marketing_consent = excluded.marketing_consent,
    session_acquisition = case
      when coalesce(analytics_sessions_v2.session_acquisition->>'source','direct') = 'direct'
       and coalesce(excluded.session_acquisition->>'source','direct') <> 'direct'
      then excluded.session_acquisition else analytics_sessions_v2.session_acquisition end,
    current_attribution = case
      when coalesce(excluded.current_attribution->>'source','direct') = 'direct'
      then analytics_sessions_v2.current_attribution else excluded.current_attribution end,
    device_type = excluded.device_type,
    browser_family = excluded.browser_family,
    os_family = excluded.os_family,
    next_sequence = analytics_sessions_v2.next_sequence + 1,
    last_seen_at = greatest(analytics_sessions_v2.last_seen_at, clock_timestamp()),
    expires_at = greatest(analytics_sessions_v2.expires_at, clock_timestamp() + interval '30 minutes')
  returning next_sequence, session_acquisition, current_attribution
  into v_sequence, v_session_acquisition, v_current_attribution;

  if p_visitor_id is not null then
    update public.analytics_visitors
    set first_acquisition = v_session_acquisition,
        last_seen_at = greatest(last_seen_at, clock_timestamp())
    where visitor_id = p_visitor_id and first_acquisition = '{}'::jsonb;
  end if;

  insert into public.analytics_events_v2 (
    event_id, event_name, schema_version, visitor_id, session_id, session_sequence,
    environment, traffic_class, analytics_consent, marketing_consent, path,
    observed_context, attributed_context, dimension_snapshots, tracking_link_id, destination_id,
    destination_slug, device_type, browser_family, os_family, metadata
  ) values (
    p_event_id, p_event_name, 1, case when p_analytics_consent then p_visitor_id else null end, p_session_id, v_sequence,
    p_environment, p_traffic_class, p_analytics_consent, p_marketing_consent, p_path,
    p_observed_context, v_current_attribution, p_dimension_snapshots, p_tracking_link_id, p_destination_id,
    left(nullif(p_destination_slug,''),80), p_device_type, left(p_browser_family,40), left(p_os_family,40), p_metadata
  );

  insert into public.analytics_quality_daily (metric_date, environment, metric_name, route, value)
  values ((now() at time zone 'Europe/Warsaw')::date, p_environment, 'stored_event', 'ingest', 1)
  on conflict (metric_date, environment, metric_name, route) do update set value = analytics_quality_daily.value + 1, updated_at = now();

  return jsonb_build_object('stored', true, 'duplicate', false, 'eventId', p_event_id, 'sessionSequence', v_sequence,
    'sessionAcquisition', v_session_acquisition, 'attributedContext', v_current_attribution);
end;
$$;
