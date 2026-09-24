-- One bounded read model over the accepted primary event tables. The older
-- consented table is application-specific and has no project_key column.
create function public.analytics_realtime_v1(
  p_project_key text,
  p_minutes integer,
  p_now timestamptz
) returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare
  result jsonb;
begin
  if p_project_key is null or p_project_key !~ '^[a-z][a-z0-9_]{1,63}$'
    or p_minutes not in (5, 30, 60) or p_minutes is null or p_now is null then
    raise exception 'invalid_realtime_window';
  end if;

  with events as materialized (
    select 'cookieless'::text mode, e.event_name, e.path, null::uuid session_id,
      coalesce(nullif(e.utm_source, ''), nullif(e.referrer_host, '')) observed_source,
      case when nullif(e.utm_source, '') is not null then 'utm_source'::text
        when nullif(e.referrer_host, '') is not null then 'referrer_host'::text end source_kind,
      e.campaign_id::text campaign_key, e.tracking_link_id, e.destination_id
    from public.analytics_cookieless_events e
    where e.project_key = p_project_key
      and e.occurred_at >= p_now - make_interval(mins => p_minutes)
      and e.occurred_at < p_now
      and e.event_name in ('page_view','contact_view','contact_click','tracking_entry','outbound_click')
    union all
    select 'consented'::text mode, e.event_name, e.path, e.session_id,
      nullif(e.observed_context->>'source', '') observed_source,
      case when nullif(e.observed_context->>'source', '') is not null then 'observed_context'::text end source_kind,
      case when (e.observed_context->>'campaignId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then e.observed_context->>'campaignId' end campaign_key,
      e.tracking_link_id, e.destination_id
    from public.analytics_events_v2 e
    where e.analytics_consent = true
      and e.occurred_at >= p_now - make_interval(mins => p_minutes)
      and e.occurred_at < p_now
      and e.event_name in ('page_view','contact_view','contact_click','tracking_entry','outbound_click','hub_resumed')
  ),
  totals as (
    select count(*)::bigint total,
      count(*) filter (where mode = 'cookieless')::bigint cookieless,
      count(*) filter (where mode = 'consented')::bigint consented,
      count(distinct session_id) filter (where mode = 'consented')::bigint consented_sessions
    from events
  ),
  names as (
    select coalesce(jsonb_object_agg(event_name, n), '{}'::jsonb) value
    from (select event_name, count(*)::bigint n from events group by event_name) grouped
  ),
  pages as (
    select coalesce(jsonb_agg(jsonb_build_object('label', path, 'count', n) order by n desc, path), '[]'::jsonb) value
    from (select path, count(*)::bigint n from events where event_name = 'page_view'
      group by path order by n desc, path limit 5) ranked
  ),
  sources as (
    select coalesce(jsonb_agg(jsonb_build_object('label', observed_source, 'count', n, 'mode', mode, 'kind', source_kind)
      order by n desc, observed_source, mode, source_kind), '[]'::jsonb) value
    from (select mode, source_kind, observed_source, count(*)::bigint n from events
      where observed_source is not null group by mode, source_kind, observed_source
      order by n desc, observed_source, mode, source_kind limit 5) ranked
  ),
  campaigns as (
    select coalesce(jsonb_agg(jsonb_build_object('label', name, 'count', n) order by n desc, name), '[]'::jsonb) value
    from (select c.name, count(*)::bigint n from events e
      join public.campaigns c on c.id::text = e.campaign_key
      where e.event_name = 'tracking_entry' group by c.id, c.name
      order by n desc, c.name limit 5) ranked
  ),
  links as (
    select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc, label), '[]'::jsonb) value
    from (select t.label || ' · ' || t.code label, count(*)::bigint n from events e
      join public.tracking_links t on t.id = e.tracking_link_id
      where e.event_name = 'tracking_entry' group by t.id, t.label, t.code
      order by n desc, label limit 5) ranked
  ),
  destinations as (
    select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc, label), '[]'::jsonb) value
    from (select d.label, count(*)::bigint n from events e
      join public.destinations d on d.id = e.destination_id
      where e.event_name = 'outbound_click' group by d.id, d.label
      order by n desc, d.label limit 5) ranked
  ),
  quality as (
    select count(*)::bigint exceptions from public.analytics_quality_exceptions q
    where q.project_key = p_project_key
      and q.occurred_at >= p_now - make_interval(mins => p_minutes)
      and q.occurred_at < p_now
  )
  select jsonb_build_object(
    'windowStart', p_now - make_interval(mins => p_minutes),
    'windowEnd', p_now,
    'refreshedAt', p_now,
    'totalEvents', totals.total,
    'cookielessEvents', totals.cookieless,
    'consentedEvents', totals.consented,
    'consentedSessionsWithActivity', totals.consented_sessions,
    'eventCounts', names.value,
    'topPages', pages.value,
    'observedSources', sources.value,
    'topCampaigns', campaigns.value,
    'topTrackingLinks', links.value,
    'topDestinations', destinations.value,
    'qualityExceptions', quality.exceptions
  ) into result
  from totals, names, pages, sources, campaigns, links, destinations, quality;
  return result;
end;
$$;

revoke all on function public.analytics_realtime_v1(text,integer,timestamptz) from public, anon, authenticated;
grant execute on function public.analytics_realtime_v1(text,integer,timestamptz) to service_role;
