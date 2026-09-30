-- The route is canonical for new facts. Historical path values stay readable.
create or replace function public.analytics_valid_event_path_v1(p_path text)
returns boolean language sql immutable set search_path = '' as $$
  select p_path in ('/','/karaoke','/dla-lokali','/kontakt','/linki','/prywatnosc','/cookies')
    or p_path ~ '^/(r|go)/[A-Za-z0-9_-]{1,80}$';
$$;

do $$
declare v_legacy_max_id bigint := coalesce((select max(id) from public.analytics_events_v2), 0);
begin
  alter table public.analytics_events_v2 drop constraint analytics_events_v2_path_check;
  execute format(
    'alter table public.analytics_events_v2 add constraint analytics_events_v2_path_check check (public.analytics_valid_event_path_v1(path) or (path in (%L,%L) and id <= %s)) not valid',
    '/privacy', '/karaoke-trojmiasto', v_legacy_max_id
  );
end;
$$;

-- Data-quality checks recognize accepted V3 names and historical route rows.
create or replace function public.analytics_data_quality_v1(
  p_project_key text, p_from_date date, p_to_date_exclusive date
) returns jsonb language sql stable security invoker set search_path = public as $$
  with bounds as (
    select (p_from_date::timestamp at time zone 'Europe/Warsaw') as start_at,
           (p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw') as end_at
    where p_from_date < p_to_date_exclusive
  ),
  consented as (
    select count(*)::bigint total,
      count(*) filter (where event_name not in ('tracking_entry','page_view','outbound_click','contact_view','contact_click','hub_resumed','cta_click','section_view')
        or (not public.analytics_valid_event_path_v1(path) and path not in ('/privacy','/karaoke-trojmiasto')))::bigint drift
    from public.analytics_events_v2 e, bounds b
    where e.analytics_consent = true and e.occurred_at >= b.start_at and e.occurred_at < b.end_at
  ),
  cookieless as (
    select count(*) filter (where project_key = p_project_key)::bigint total,
      count(*) filter (where project_key <> p_project_key
        or event_name not in ('page_view','contact_view','contact_click','tracking_entry','outbound_click')
        or (not public.analytics_valid_event_path_v1(path) and path <> '/karaoke-trojmiasto'))::bigint drift
    from public.analytics_cookieless_events e, bounds b
    where e.occurred_at >= b.start_at and e.occurred_at < b.end_at
  ),
  exceptions as (
    select count(*) filter (where outcome = 'rejected')::bigint rejected,
      count(*) filter (where outcome = 'duplicate')::bigint duplicates,
      count(*) filter (where outcome = 'filtered')::bigint filtered
    from public.analytics_quality_exceptions q, bounds b
    where q.project_key = p_project_key and q.occurred_at >= b.start_at and q.occurred_at < b.end_at
  ),
  reasons as (
    select coalesce(jsonb_agg(jsonb_build_object('reason', reason, 'count', n) order by n desc, reason), '[]'::jsonb) rows
    from (
      select reason, count(*)::bigint n from public.analytics_quality_exceptions q, bounds b
      where q.project_key = p_project_key and q.outcome = 'rejected'
        and q.occurred_at >= b.start_at and q.occurred_at < b.end_at
      group by reason
    ) grouped
  ),
  events as (
    select coalesce(jsonb_agg(jsonb_build_object('eventName', event_name, 'count', n) order by n desc, event_name), '[]'::jsonb) rows
    from (
      select event_name, count(*)::bigint n from (
        select e.event_name from public.analytics_events_v2 e, bounds b
        where e.analytics_consent = true and e.occurred_at >= b.start_at and e.occurred_at < b.end_at
        union all
        select e.event_name from public.analytics_cookieless_events e, bounds b
        where e.project_key = p_project_key and e.occurred_at >= b.start_at and e.occurred_at < b.end_at
      ) primary_events group by event_name
    ) grouped
  )
  select jsonb_build_object(
    'persistedConsented', consented.total,
    'persistedCookieless', cookieless.total,
    'persistedTotal', consented.total + cookieless.total,
    'rejected', exceptions.rejected,
    'duplicates', exceptions.duplicates,
    'filtered', exceptions.filtered,
    'contractDrift', consented.drift + cookieless.drift,
    'rejectionReasons', reasons.rows,
    'eventNames', events.rows
  ) from consented, cookieless, exceptions, reasons, events;
$$;
alter table public.analytics_events_v2 validate constraint analytics_events_v2_path_check;

-- Cookieless rows have UUID keys, so the write RPC enforces the new-path rule;
-- the table constraint retains the historical page value for existing rows.
alter table public.analytics_cookieless_events drop constraint analytics_cookieless_events_path_check;
alter table public.analytics_cookieless_events add constraint analytics_cookieless_events_path_check
  check (public.analytics_valid_event_path_v1(path) or (event_name = 'page_view' and path = '/karaoke-trojmiasto')) not valid;
alter table public.analytics_cookieless_events validate constraint analytics_cookieless_events_path_check;
alter table public.analytics_cookieless_events drop constraint analytics_cookieless_events_check1;
alter table public.analytics_cookieless_events add constraint analytics_cookieless_page_path_v3
  check (event_name <> 'page_view' or path in ('/','/karaoke','/karaoke-trojmiasto','/dla-lokali','/kontakt','/linki','/prywatnosc','/cookies')) not valid;
alter table public.analytics_cookieless_events validate constraint analytics_cookieless_page_path_v3;

create or replace function public.analytics_ingest_cookieless_v1(
  p_event_id uuid, p_project_key text, p_event_name text, p_environment text,
  p_traffic_class text, p_path text, p_referrer_host text,
  p_utm_source text, p_utm_medium text, p_utm_campaign text,
  p_utm_content text, p_utm_term text, p_tracking_link_id uuid,
  p_campaign_id uuid, p_asset_id uuid, p_placement_id uuid,
  p_destination_id uuid, p_destination_slug text
)
returns boolean language plpgsql security invoker set search_path = public as $$
begin
  if not public.analytics_valid_event_path_v1(p_path) then raise exception 'invalid_path'; end if;
  insert into public.analytics_cookieless_events (
    event_id, project_key, event_name, environment, traffic_class, path,
    referrer_host, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    tracking_link_id, campaign_id, asset_id, placement_id, destination_id, destination_slug
  ) values (
    p_event_id, p_project_key, p_event_name, p_environment, p_traffic_class, p_path,
    p_referrer_host, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_tracking_link_id, p_campaign_id, p_asset_id, p_placement_id, p_destination_id, p_destination_slug
  ) on conflict (event_id) do nothing;
  return found;
end;
$$;

alter table public.analytics_events_v2 drop constraint analytics_events_v2_check;
alter table public.analytics_events_v2 add constraint analytics_events_v2_event_name_v3
  check (event_name in ('tracking_entry','page_view','outbound_click','contact_view','contact_click','hub_resumed','cta_click','section_view')
    or (schema_version = 0 and event_name = 'legacy_interaction')) not valid;
alter table public.analytics_events_v2 validate constraint analytics_events_v2_event_name_v3;

alter table public.analytics_quality_exceptions drop constraint analytics_quality_exceptions_event_name_check;
alter table public.analytics_quality_exceptions add constraint analytics_quality_exceptions_event_name_v3
  check (event_name in ('page_view','contact_view','contact_click','hub_resumed','tracking_entry','outbound_click','cta_click','section_view')) not valid;
alter table public.analytics_quality_exceptions validate constraint analytics_quality_exceptions_event_name_v3;
alter table public.analytics_quality_exceptions drop constraint analytics_quality_exceptions_path_check;
alter table public.analytics_quality_exceptions add constraint analytics_quality_exceptions_path_check
  check (public.analytics_valid_event_path_v1(path) or path in ('/privacy','/karaoke-trojmiasto')) not valid;
alter table public.analytics_quality_exceptions validate constraint analytics_quality_exceptions_path_check;

create or replace function public.analytics_ingest_event_v1(
  p_event_id uuid, p_event_name text, p_session_id uuid, p_visitor_id uuid,
  p_environment text, p_traffic_class text, p_analytics_consent boolean,
  p_marketing_consent boolean, p_path text, p_observed_context jsonb,
  p_attributed_context jsonb, p_dimension_snapshots jsonb, p_tracking_link_id uuid,
  p_destination_id uuid, p_destination_slug text, p_device_type text,
  p_browser_family text, p_os_family text, p_metadata jsonb
)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_sequence integer;
  v_session_acquisition jsonb;
  v_current_attribution jsonb;
  v_existing record;
begin
  if p_event_name not in ('tracking_entry','page_view','outbound_click','contact_view','contact_click','hub_resumed','cta_click','section_view') then raise exception 'invalid_event_name'; end if;
  if p_environment not in ('production','staging','preview','development') then raise exception 'invalid_environment'; end if;
  if p_traffic_class not in ('external','internal','test','bot') then raise exception 'invalid_traffic_class'; end if;
  if not public.analytics_valid_event_path_v1(p_path) then raise exception 'invalid_path'; end if;
  if p_event_name in ('cta_click','section_view') and not p_analytics_consent then raise exception 'consent_required'; end if;
  if jsonb_typeof(p_observed_context) <> 'object' or octet_length(p_observed_context::text) > 4096 then raise exception 'invalid_observed_context'; end if;
  if jsonb_typeof(p_attributed_context) <> 'object' or octet_length(p_attributed_context::text) > 4096 then raise exception 'invalid_attributed_context'; end if;
  if jsonb_typeof(p_dimension_snapshots) <> 'object' or octet_length(p_dimension_snapshots::text) > 4096 then raise exception 'invalid_dimension_snapshots'; end if;
  if jsonb_typeof(p_metadata) <> 'object' or octet_length(p_metadata::text) > 8192 then raise exception 'invalid_metadata'; end if;
  if p_visitor_id is not null and not p_analytics_consent then raise exception 'visitor_requires_analytics_consent'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));
  select event_id, session_sequence into v_existing from public.analytics_events_v2 where event_id = p_event_id;
  if found then
    begin
      insert into public.analytics_quality_daily (metric_date, environment, metric_name, route, value)
      values ((now() at time zone 'Europe/Warsaw')::date, p_environment, 'duplicate_event', 'ingest', 1)
      on conflict (metric_date, environment, metric_name, route) do update set value = analytics_quality_daily.value + 1, updated_at = now();
    exception when others then
      null;
    end;
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

  begin
    insert into public.analytics_quality_daily (metric_date, environment, metric_name, route, value)
    values ((now() at time zone 'Europe/Warsaw')::date, p_environment, 'stored_event', 'ingest', 1)
    on conflict (metric_date, environment, metric_name, route) do update set value = analytics_quality_daily.value + 1, updated_at = now();
  exception when others then null;
  end;

  return jsonb_build_object('stored', true, 'duplicate', false, 'eventId', p_event_id, 'sessionSequence', v_sequence,
    'sessionAcquisition', v_session_acquisition, 'attributedContext', v_current_attribution);
end;
$$;

-- One printed distribution unit is one stable /r link; assets and placements
-- remain reusable. This narrow audited mutation extends the existing form.
create function public.admin_tracking_link_create_v3(
  p_actor_user_id uuid, p_actor_email text, p_code text, p_label text,
  p_campaign_id uuid, p_channel_group text, p_source text, p_medium text,
  p_asset text, p_asset_slug text, p_placement text, p_placement_slug text,
  p_landing_path text, p_distribution_unit text
)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_asset_id uuid;
  v_placement_id uuid;
  v_id uuid;
  v_new jsonb;
  v_unit text := nullif(btrim(p_distribution_unit), '');
begin
  perform public.assert_admin_editor_v1(p_actor_user_id);
  if v_unit is not null and (length(v_unit) > 80 or position(chr(10) in v_unit) > 0 or position(chr(13) in v_unit) > 0) then
    raise exception 'invalid_distribution_unit' using errcode = '23514';
  end if;
  if nullif(p_asset, '') is not null then
    insert into public.analytics_assets as a (campaign_id, slug, label)
    values (p_campaign_id, p_asset_slug, p_asset)
    on conflict (campaign_id, slug) do update set label = excluded.label
    returning a.id into v_asset_id;
  end if;
  if nullif(p_placement, '') is not null then
    insert into public.analytics_placements as p (slug, label)
    values (p_placement_slug, p_placement)
    on conflict (slug) do update set label = excluded.label
    returning p.id into v_placement_id;
  end if;
  insert into public.tracking_links as t (
    code, label, campaign_id, channel_group, source, medium,
    asset, placement, asset_id, placement_id, distribution_unit, landing_path, active
  ) values (
    p_code, p_label, p_campaign_id, p_channel_group, p_source, p_medium,
    p_asset, p_placement, v_asset_id, v_placement_id, v_unit, p_landing_path, true
  ) returning t.id, to_jsonb(t) into v_id, v_new;
  insert into public.audit_log (
    actor_user_id, actor_email, action, entity_type, entity_id, new_value
  ) values (
    p_actor_user_id, p_actor_email, 'tracking_link.create', 'tracking_link', v_id::text, v_new
  );
  return jsonb_build_object('id', v_id, 'row', v_new);
end;
$$;
revoke all on function public.admin_tracking_link_create_v3(uuid,text,text,text,uuid,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.admin_tracking_link_create_v3(uuid,text,text,text,uuid,text,text,text,text,text,text,text,text,text) to service_role;

-- Fixed, consented session journeys. Counts describe ordered session behavior,
-- not people, completed emails, attendance, or partner leads.
create function public.analytics_marketing_journey_v3(
  p_journey text, p_from_date date, p_to_date_exclusive date, p_scope text
) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare result jsonb;
begin
  if p_journey is null or p_journey not in ('participant','venue')
    or p_scope is null or p_scope not in ('business','diagnostic')
    or p_from_date is null or p_to_date_exclusive is null
    or p_to_date_exclusive <= p_from_date or p_to_date_exclusive > p_from_date + 366 then
    raise exception 'invalid_journey_request';
  end if;

  with recursive steps(ord, step_key, event_name, event_path, ids) as (
    select v.ord, v.step_key, v.event_name, v.event_path, v.ids from (values
      ('participant',1,'karaoke_cta','cta_click','/',array['home.hero_karaoke','home.participation_karaoke']),
      ('participant',2,'karaoke_view','page_view','/karaoke',null::text[]),
      ('participant',3,'current_info_cta','cta_click','/karaoke',array['karaoke.hero_dates','karaoke.current_dates']),
      ('participant',4,'channels_view','page_view','/linki',null::text[]),
      ('venue',1,'venue_cta','cta_click','/',array['home.case_venues']),
      ('venue',2,'venue_view','page_view','/dla-lokali',null::text[]),
      ('venue',3,'contact_cta','cta_click','/dla-lokali',array['venues.hero_contact','venues.closing_contact']),
      ('venue',4,'contact_view','contact_view','/kontakt',null::text[]),
      ('venue',5,'contact_click','contact_click','/kontakt',null::text[])
    ) v(journey,ord,step_key,event_name,event_path,ids)
    where v.journey = p_journey
  ), eligible as not materialized (
    select e.session_id, e.session_sequence, e.occurred_at, e.event_name, e.path, e.metadata
    from public.analytics_events_v2 e
    where e.analytics_consent = true and e.schema_version = 1
      and public.analytics_reporting_eligible_v1(p_scope,e.environment,e.traffic_class)
      and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
      and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
  ), first_step as (
    select distinct on (e.session_id) e.session_id, 1 as ord, e.occurred_at, e.session_sequence
    from eligible e join steps s on s.ord = 1 and s.event_name = e.event_name and s.event_path = e.path
      and (s.ids is null or e.metadata->>'ctaId' = any(s.ids))
    order by e.session_id, e.occurred_at, e.session_sequence
  ), progression as (
    select * from first_step
    union all
    select p.session_id, s.ord, next_event.occurred_at, next_event.session_sequence
    from progression p join steps s on s.ord = p.ord + 1
    join lateral (
      select e.occurred_at, e.session_sequence from eligible e
      where e.session_id = p.session_id and e.event_name = s.event_name and e.path = s.event_path
        and (s.ids is null or e.metadata->>'ctaId' = any(s.ids))
        and e.session_sequence > p.session_sequence and e.occurred_at >= p.occurred_at
      order by e.occurred_at, e.session_sequence limit 1
    ) next_event on true
  ), counts as (
    select s.ord, s.step_key, coalesce(n.sessions,0)::bigint sessions
    from steps s left join (select ord, count(*)::bigint sessions from progression group by ord) n on n.ord = s.ord
  )
  select jsonb_build_object(
    'journey',p_journey,'scope',p_scope,'fromDate',p_from_date,'toDateExclusive',p_to_date_exclusive,
    'eligibleSessions',(select count(distinct session_id) from eligible),
    'routeViewSessions',(select count(distinct session_id) from eligible e where e.event_name = 'page_view'
      and e.path = case when p_journey = 'participant' then '/karaoke' else '/dla-lokali' end),
    'steps',(select jsonb_agg(jsonb_build_object('key',step_key,'sessions',sessions) order by ord) from counts),
    'proofExposures',(select count(*) from eligible e where e.event_name = 'section_view'
      and e.metadata->>'sectionId' = case when p_journey = 'participant' then 'home.participation' else 'home.case_study' end),
    'venueProofExposures',(select count(*) from eligible e where p_journey = 'venue' and e.event_name = 'section_view'
      and e.metadata->>'sectionId' = 'venues.case_study')
  ) into result;
  return result;
end;
$$;
revoke all on function public.analytics_marketing_journey_v3(text,date,date,text) from public, anon, authenticated;
grant execute on function public.analytics_marketing_journey_v3(text,date,date,text) to service_role;
