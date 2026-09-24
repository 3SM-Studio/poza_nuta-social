-- One bounded read over accepted primary events. Definitions are fixed on the server;
-- quality exceptions and legacy schema_version=0 rows are outside this population.
create function public.analytics_key_events_v1(
  p_project_key text, p_from_date date, p_to_date_exclusive date, p_scope text
) returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare result jsonb;
begin
  if p_project_key is null or p_project_key !~ '^[a-z][a-z0-9_]{1,63}$'
    or p_scope is null or p_scope not in ('business','diagnostic')
    or p_from_date is null or p_to_date_exclusive is null
    or p_to_date_exclusive <= p_from_date or p_to_date_exclusive > p_from_date + 366 then
    raise exception 'invalid_key_events_request';
  end if;

  with definitions(ord,event_name) as (values (1,'outbound_click'::text),(2,'contact_click'::text)),
  eligible as (
    select e.event_name, 'cookieless'::text mode, null::uuid session_id
    from public.analytics_cookieless_events e
    where e.project_key = p_project_key
      and e.event_name in ('outbound_click','contact_click')
      and public.analytics_reporting_eligible_v1(p_scope,e.environment,e.traffic_class)
      and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
      and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
    union all
    select e.event_name, 'consented'::text mode, e.session_id
    from public.analytics_events_v2 e
    where e.analytics_consent = true and e.schema_version = 1
      and e.event_name in ('outbound_click','contact_click')
      and public.analytics_reporting_eligible_v1(p_scope,e.environment,e.traffic_class)
      and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
      and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
  ), counts as (
    select event_name,
      count(*) filter (where mode='cookieless')::bigint cookieless_events,
      count(*) filter (where mode='consented')::bigint consented_events,
      count(distinct session_id) filter (where mode='consented')::bigint consented_sessions
    from eligible group by event_name
  )
  select jsonb_build_object(
    'scope',p_scope,'fromDate',p_from_date,'toDateExclusive',p_to_date_exclusive,
    'outcomes',coalesce(jsonb_agg(jsonb_build_object(
      'eventName',d.event_name,
      'cookielessEvents',coalesce(c.cookieless_events,0),
      'consentedEvents',coalesce(c.consented_events,0),
      'acceptedEvents',coalesce(c.cookieless_events,0)+coalesce(c.consented_events,0),
      'consentedSessionsWithEvent',coalesce(c.consented_sessions,0)
    ) order by d.ord),'[]'::jsonb)
  ) into result
  from definitions d left join counts c on c.event_name=d.event_name;
  return result;
end;
$$;
revoke all on function public.analytics_key_events_v1(text,date,date,text) from public, anon, authenticated;
grant execute on function public.analytics_key_events_v1(text,date,date,text) to service_role;
