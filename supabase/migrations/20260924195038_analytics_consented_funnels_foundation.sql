-- Session-scoped, server-owned funnel presets. Only accepted consented primary
-- events participate; cookieless and quality observations have no path here.
create function public.analytics_funnel_v1(
  p_funnel_key text, p_from_date date, p_to_date_exclusive date, p_scope text
) returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare result jsonb;
begin
  if p_funnel_key is null or p_funnel_key not in ('contact_intent','tracked_entry_to_contact')
    or p_scope is null or p_scope not in ('business','diagnostic')
    or p_from_date is null or p_to_date_exclusive is null
    or p_to_date_exclusive <= p_from_date or p_to_date_exclusive > p_from_date + 366 then
    raise exception 'invalid_funnel_request';
  end if;

  with recursive steps(ord, step_key, event_name) as (
    select v.ord, v.step_key, v.event_name from (values
      ('contact_intent', 1, 'contact_view', 'contact_view'),
      ('contact_intent', 2, 'contact_click', 'contact_click'),
      ('tracked_entry_to_contact', 1, 'tracking_entry', 'tracking_entry'),
      ('tracked_entry_to_contact', 2, 'contact_view', 'contact_view'),
      ('tracked_entry_to_contact', 3, 'contact_click', 'contact_click')
    ) v(funnel_key, ord, step_key, event_name)
    where v.funnel_key = p_funnel_key
  ), eligible as not materialized (
    select e.session_id, e.session_sequence, e.occurred_at, e.event_name
    from public.analytics_events_v2 e
    where e.analytics_consent = true
      and e.schema_version = 1
      and public.analytics_reporting_eligible_v1(p_scope,e.environment,e.traffic_class)
      and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
      and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
  ), first_step as (
    select distinct on (e.session_id) e.session_id, 1 as ord, e.occurred_at, e.session_sequence
    from eligible e join steps s on s.ord = 1 and s.event_name = e.event_name
    order by e.session_id, e.occurred_at, e.session_sequence
  ), progression as (
    select * from first_step
    union all
    select p.session_id, s.ord, next_event.occurred_at, next_event.session_sequence
    from progression p
    join steps s on s.ord = p.ord + 1
    join lateral (
      select e.occurred_at, e.session_sequence from eligible e
      where e.session_id = p.session_id and e.event_name = s.event_name
        and e.session_sequence > p.session_sequence
        and e.occurred_at >= p.occurred_at
      order by e.occurred_at, e.session_sequence limit 1
    ) next_event on true
  ), counts as (
    select s.ord, s.step_key, coalesce(n.sessions,0)::bigint sessions
    from steps s left join (
      select ord, count(*)::bigint sessions from progression group by ord
    ) n on n.ord = s.ord
  ), compared as (
    select ord, step_key, sessions, lag(sessions) over (order by ord) previous_sessions
    from counts
  )
  select jsonb_build_object(
    'funnelKey',p_funnel_key,'scope',p_scope,
    'fromDate',p_from_date,'toDateExclusive',p_to_date_exclusive,
    'eligibleSessions',(select count(distinct session_id) from eligible),
    'entrants',coalesce((select sessions from counts where ord=1),0),
    'completionRate',case when (select sessions from counts where ord=1) > 0
      then round(100.0 * (select sessions from counts order by ord desc limit 1)
        / (select sessions from counts where ord=1),1) else null end,
    'steps',(select jsonb_agg(jsonb_build_object(
      'key',step_key,'sessions',sessions,'previousSessions',previous_sessions,
      'conversionRate',case when previous_sessions > 0 then round(100.0 * sessions / previous_sessions,1) else null end,
      'dropOff',case when previous_sessions is not null then previous_sessions - sessions else null end,
      'dropOffRate',case when previous_sessions > 0 then round(100.0 * (previous_sessions - sessions) / previous_sessions,1) else null end
    ) order by ord) from compared)
  ) into result;
  return result;
end;
$$;
revoke all on function public.analytics_funnel_v1(text,date,date,text) from public, anon, authenticated;
grant execute on function public.analytics_funnel_v1(text,date,date,text) to service_role;
