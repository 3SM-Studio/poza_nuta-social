-- Session-scoped, read-time predicates over accepted consented events only.
-- The Key Event names mirror analytics_key_events_v1 and the server Outcome contract.
create function public.analytics_consented_segments_v1(
  p_project_key text, p_from_date date, p_to_date_exclusive date,
  p_scope text, p_segment_key text
) returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_result jsonb;
begin
  if p_project_key is distinct from 'poza_nuta'
    or p_scope is null or p_scope not in ('business','diagnostic')
    or p_segment_key is null or p_segment_key not in ('key_events','contact_click','outbound_click','tracking_entry')
    or p_from_date is null or p_to_date_exclusive is null
    or p_to_date_exclusive <= p_from_date or p_to_date_exclusive > p_from_date + 366 then
    raise exception 'invalid_segments_request';
  end if;

  with eligible_events as materialized (
    select e.session_id, e.event_name
    from public.analytics_events_v2 e
    where e.analytics_consent = true and e.schema_version = 1
      and public.analytics_reporting_eligible_v1(p_scope,e.environment,e.traffic_class)
      and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
      and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
  ), session_facts as materialized (
    select session_id,
      count(*) filter (where event_name = 'page_view')::bigint page_views,
      count(*) filter (where event_name = 'contact_click')::bigint contact_clicks,
      count(*) filter (where event_name = 'outbound_click')::bigint outbound_clicks,
      count(*) filter (where event_name = 'tracking_entry')::bigint tracking_entries
    from eligible_events group by session_id
  ), memberships as materialized (
    select f.session_id, m.segment_key
    from session_facts f
    cross join lateral (values
      ('key_events'::text, f.contact_clicks > 0 or f.outbound_clicks > 0),
      ('contact_click'::text, f.contact_clicks > 0),
      ('outbound_click'::text, f.outbound_clicks > 0),
      ('tracking_entry'::text, f.tracking_entries > 0)
    ) m(segment_key,is_member)
    where m.is_member
  ), segment_counts as (
    select segment_key, count(*)::bigint sessions from memberships group by segment_key
  ), selected_facts as (
    select f.* from session_facts f
    join memberships m on m.session_id = f.session_id and m.segment_key = p_segment_key
  ), selected_metrics as (
    select count(*)::bigint sessions,
      coalesce(sum(page_views),0)::bigint page_views,
      coalesce(sum(contact_clicks),0)::bigint contact_clicks,
      coalesce(sum(outbound_clicks),0)::bigint outbound_clicks,
      coalesce(sum(tracking_entries),0)::bigint tracking_entries,
      count(*) filter (where contact_clicks > 0 or outbound_clicks > 0)::bigint sessions_with_key_event
    from selected_facts
  ), base as (select count(*)::bigint sessions from session_facts),
  definitions(ord,segment_key) as (values
    (1,'key_events'::text),(2,'contact_click'::text),
    (3,'outbound_click'::text),(4,'tracking_entry'::text)
  ), rows as (
    select coalesce(jsonb_agg(jsonb_build_object('key',d.segment_key,'sessions',coalesce(c.sessions,0)) order by d.ord),'[]'::jsonb) segments
    from definitions d left join segment_counts c using (segment_key)
  )
  select jsonb_build_object(
    'scope',p_scope,'fromDate',p_from_date,'toDateExclusive',p_to_date_exclusive,
    'baseSessions',b.sessions,'segments',r.segments,'selectedKey',p_segment_key,
    'selected',jsonb_build_object('sessions',s.sessions,'pageViews',s.page_views,
      'contactClickEvents',s.contact_clicks,'outboundClickEvents',s.outbound_clicks,
      'trackingEntries',s.tracking_entries,'sessionsWithKeyEvent',s.sessions_with_key_event)
  ) into v_result from base b cross join rows r cross join selected_metrics s;
  return v_result;
end;
$$;

revoke all on function public.analytics_consented_segments_v1(text,date,date,text,text) from public, anon, authenticated;
grant execute on function public.analytics_consented_segments_v1(text,date,date,text,text) to service_role;
