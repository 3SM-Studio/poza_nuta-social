-- Local, transactional benchmark. No synthetic rows survive.
begin;
insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent)
select ('b5000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'production','external',true
from generate_series(1,3000) n;
insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path)
select ('b7000000-0000-4000-8000-' || lpad(((n-1)*3+step)::text,12,'0'))::uuid,
  'page_view',
  '2032-05-01 12:00:00+00'::timestamptz + (n % 30) * interval '1 day' + step * interval '1 second',
  ('b5000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
  step,'production','external',true,
  case step when 1 then '/' when 2 then '/kontakt' else '/linki' end
from generate_series(1,3000) n cross join generate_series(1,3) step;
analyze public.analytics_events_v2;

-- Business 7 days: entry
explain (analyze,buffers,format json) with eligible as (select session_id, session_sequence, occurred_at, path
  from public.analytics_events_v2
  where analytics_consent = true and schema_version = 1 and event_name = 'page_view'
    and public.analytics_reporting_eligible_v1('business',environment,traffic_class)
    and occurred_at >= '2032-05-24'::date::timestamp at time zone 'Europe/Warsaw'
    and occurred_at < '2032-05-31'::date::timestamp at time zone 'Europe/Warsaw'), numbered as (
  select session_id,path,row_number() over (partition by session_id order by occurred_at,session_sequence) step from eligible
) select path,count(*) from numbered where step=1 group by path order by count(*) desc,path limit 10;

-- Business 7 days: next
explain (analyze,buffers,format json) with eligible as (select session_id, session_sequence, occurred_at, path
  from public.analytics_events_v2
  where analytics_consent = true and schema_version = 1 and event_name = 'page_view'
    and public.analytics_reporting_eligible_v1('business',environment,traffic_class)
    and occurred_at >= '2032-05-24'::date::timestamp at time zone 'Europe/Warsaw'
    and occurred_at < '2032-05-31'::date::timestamp at time zone 'Europe/Warsaw'), numbered as (
  select session_id,path,session_sequence,row_number() over (partition by session_id order by occurred_at,session_sequence) step,
  lead(path) over (partition by session_id order by occurred_at,session_sequence) next_path,
  lead(session_sequence) over (partition by session_id order by occurred_at,session_sequence) next_sequence from eligible
), first_selected as (
  select distinct on (session_id) session_id,next_path,next_sequence,session_sequence from numbered where path='/' order by session_id,step
) select next_path,count(*) from first_selected where next_path is not null and next_sequence > session_sequence group by next_path order by count(*) desc,next_path limit 10;

-- Business 7 days: previous
explain (analyze,buffers,format json) with eligible as (select session_id, session_sequence, occurred_at, path
  from public.analytics_events_v2
  where analytics_consent = true and schema_version = 1 and event_name = 'page_view'
    and public.analytics_reporting_eligible_v1('business',environment,traffic_class)
    and occurred_at >= '2032-05-24'::date::timestamp at time zone 'Europe/Warsaw'
    and occurred_at < '2032-05-31'::date::timestamp at time zone 'Europe/Warsaw'), numbered as (
  select session_id,path,row_number() over (partition by session_id order by occurred_at,session_sequence) step,
  lag(path) over (partition by session_id order by occurred_at,session_sequence) previous_path from eligible
), first_selected as (
  select distinct on (session_id) session_id,previous_path from numbered where path='/kontakt' order by session_id,step
) select previous_path,count(*) from first_selected where previous_path is not null group by previous_path order by count(*) desc,previous_path limit 10;

-- Business 7 days: short
explain (analyze,buffers,format json) with eligible as (select session_id, session_sequence, occurred_at, path
  from public.analytics_events_v2
  where analytics_consent = true and schema_version = 1 and event_name = 'page_view'
    and public.analytics_reporting_eligible_v1('business',environment,traffic_class)
    and occurred_at >= '2032-05-24'::date::timestamp at time zone 'Europe/Warsaw'
    and occurred_at < '2032-05-31'::date::timestamp at time zone 'Europe/Warsaw'), numbered as (
  select session_id,path,row_number() over (partition by session_id order by occurred_at,session_sequence) step from eligible
), prefixes as (
  select session_id,array_agg(path order by step) nodes from numbered where step<=3 group by session_id
) select nodes,count(*) from prefixes group by nodes order by count(*) desc,nodes limit 10;

-- Business 30 days: entry
explain (analyze,buffers,format json) with eligible as (select session_id, session_sequence, occurred_at, path
  from public.analytics_events_v2
  where analytics_consent = true and schema_version = 1 and event_name = 'page_view'
    and public.analytics_reporting_eligible_v1('business',environment,traffic_class)
    and occurred_at >= '2032-05-01'::date::timestamp at time zone 'Europe/Warsaw'
    and occurred_at < '2032-05-31'::date::timestamp at time zone 'Europe/Warsaw'), numbered as (
  select session_id,path,row_number() over (partition by session_id order by occurred_at,session_sequence) step from eligible
) select path,count(*) from numbered where step=1 group by path order by count(*) desc,path limit 10;

-- Business 30 days: next
explain (analyze,buffers,format json) with eligible as (select session_id, session_sequence, occurred_at, path
  from public.analytics_events_v2
  where analytics_consent = true and schema_version = 1 and event_name = 'page_view'
    and public.analytics_reporting_eligible_v1('business',environment,traffic_class)
    and occurred_at >= '2032-05-01'::date::timestamp at time zone 'Europe/Warsaw'
    and occurred_at < '2032-05-31'::date::timestamp at time zone 'Europe/Warsaw'), numbered as (
  select session_id,path,session_sequence,row_number() over (partition by session_id order by occurred_at,session_sequence) step,
  lead(path) over (partition by session_id order by occurred_at,session_sequence) next_path,
  lead(session_sequence) over (partition by session_id order by occurred_at,session_sequence) next_sequence from eligible
), first_selected as (
  select distinct on (session_id) session_id,next_path,next_sequence,session_sequence from numbered where path='/' order by session_id,step
) select next_path,count(*) from first_selected where next_path is not null and next_sequence > session_sequence group by next_path order by count(*) desc,next_path limit 10;

-- Business 30 days: previous
explain (analyze,buffers,format json) with eligible as (select session_id, session_sequence, occurred_at, path
  from public.analytics_events_v2
  where analytics_consent = true and schema_version = 1 and event_name = 'page_view'
    and public.analytics_reporting_eligible_v1('business',environment,traffic_class)
    and occurred_at >= '2032-05-01'::date::timestamp at time zone 'Europe/Warsaw'
    and occurred_at < '2032-05-31'::date::timestamp at time zone 'Europe/Warsaw'), numbered as (
  select session_id,path,row_number() over (partition by session_id order by occurred_at,session_sequence) step,
  lag(path) over (partition by session_id order by occurred_at,session_sequence) previous_path from eligible
), first_selected as (
  select distinct on (session_id) session_id,previous_path from numbered where path='/kontakt' order by session_id,step
) select previous_path,count(*) from first_selected where previous_path is not null group by previous_path order by count(*) desc,previous_path limit 10;

-- Business 30 days: short
explain (analyze,buffers,format json) with eligible as (select session_id, session_sequence, occurred_at, path
  from public.analytics_events_v2
  where analytics_consent = true and schema_version = 1 and event_name = 'page_view'
    and public.analytics_reporting_eligible_v1('business',environment,traffic_class)
    and occurred_at >= '2032-05-01'::date::timestamp at time zone 'Europe/Warsaw'
    and occurred_at < '2032-05-31'::date::timestamp at time zone 'Europe/Warsaw'), numbered as (
  select session_id,path,row_number() over (partition by session_id order by occurred_at,session_sequence) step from eligible
), prefixes as (
  select session_id,array_agg(path order by step) nodes from numbered where step<=3 group by session_id
) select nodes,count(*) from prefixes group by nodes order by count(*) desc,nodes limit 10;

rollback;
