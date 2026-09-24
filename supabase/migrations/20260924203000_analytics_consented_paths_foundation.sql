-- Page-only paths over accepted, consented events in the selected event window.
-- The only identity is a session_id; scope is applied before ordering.
create function public.analytics_paths_v1(
  p_from_date date, p_to_date_exclusive date, p_scope text, p_path text default null
) returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare result jsonb;
begin
  if p_scope is null or p_scope not in ('business','diagnostic')
    or p_from_date is null or p_to_date_exclusive is null
    or p_to_date_exclusive <= p_from_date or p_to_date_exclusive > p_from_date + 366
    or (p_path is not null and (octet_length(p_path) > 160 or p_path !~ '^/[A-Za-z0-9/_-]*$')) then
    raise exception 'invalid_paths_request';
  end if;

  with eligible as materialized (
    select e.session_id, e.session_sequence, e.occurred_at, e.path
    from public.analytics_events_v2 e
    where e.analytics_consent = true and e.schema_version = 1 and e.event_name = 'page_view'
      and public.analytics_reporting_eligible_v1(p_scope,e.environment,e.traffic_class)
      and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
      and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
  ), numbered as (
    select session_id, path, session_sequence,
      row_number() over (partition by session_id order by occurred_at,session_sequence) as step,
      lag(path) over (partition by session_id order by occurred_at,session_sequence) as previous_path,
      lead(path) over (partition by session_id order by occurred_at,session_sequence) as next_path,
      lead(session_sequence) over (partition by session_id order by occurred_at,session_sequence) as next_sequence
    from eligible
  ), first_selected as (
    select distinct on (session_id) session_id, path, previous_path, next_path, session_sequence, next_sequence
    from numbered where path = p_path order by session_id, step
  ), prefixes as (
    select session_id, array_agg(path order by step) as nodes
    from numbered where step <= 3 group by session_id
  ), entries as (
    select path, count(*)::bigint sessions from numbered where step = 1 group by path
  ), short_paths as (
    select nodes, count(*)::bigint sessions from prefixes group by nodes
  ), next_counts as (
    select next_path as path, count(*)::bigint sessions from first_selected
    where next_path is not null and next_sequence > session_sequence group by next_path
  ), previous_counts as (
    select previous_path as path, count(*)::bigint sessions from first_selected
    where previous_path is not null group by previous_path
  )
  select jsonb_build_object(
    'scope',p_scope,'fromDate',p_from_date,'toDateExclusive',p_to_date_exclusive,
    'nodeType','page','maxDepth',3,'rankingLimit',10,
    'pathSessions',(select count(*) from prefixes),
    'entries',coalesce((select jsonb_agg(jsonb_build_object('path',path,'sessions',sessions) order by sessions desc,path)
      from (select * from entries order by sessions desc,path limit 10) x),'[]'::jsonb),
    'shortPaths',coalesce((select jsonb_agg(jsonb_build_object('paths',nodes,'sessions',sessions) order by sessions desc,nodes)
      from (select * from short_paths order by sessions desc,nodes limit 10) x),'[]'::jsonb),
    'selectedPath',p_path,
    'selectedSessions',(select count(*) from first_selected),
    'next',coalesce((select jsonb_agg(jsonb_build_object('path',path,'sessions',sessions) order by sessions desc,path)
      from (select * from next_counts order by sessions desc,path limit 10) x),'[]'::jsonb),
    'previous',coalesce((select jsonb_agg(jsonb_build_object('path',path,'sessions',sessions) order by sessions desc,path)
      from (select * from previous_counts order by sessions desc,path limit 10) x),'[]'::jsonb),
    'noNextInRange',(select count(*) from first_selected where next_path is null or next_sequence <= session_sequence),
    'noPreviousInRange',(select count(*) from first_selected where previous_path is null)
  ) into result;
  return result;
end;
$$;
revoke all on function public.analytics_paths_v1(date,date,text,text) from public, anon, authenticated;
grant execute on function public.analytics_paths_v1(date,date,text,text) to service_role;
