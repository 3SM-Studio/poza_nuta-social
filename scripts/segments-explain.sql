-- Local-only transactional benchmark. Run with docker exec -i ... psql -f -.
-- The fixture is synthetic and rolls back. Timings are not production forecasts.
\set ON_ERROR_STOP on
begin;
insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent)
select ('f1000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid,
  case when g % 10 = 0 then 'preview' else 'production' end,
  case when g % 10 = 0 then 'test' else 'external' end,true
from generate_series(1,1000) g;
insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path)
select ('f2000000-0000-4000-8000-' || lpad((g*10+n)::text,12,'0'))::uuid,
  case when n=1 then 'page_view'
    when n=2 and g%4=0 then 'contact_click'
    when n=2 and g%4=1 then 'outbound_click'
    when n=2 and g%4=2 then 'tracking_entry'
    when n=3 and g%4=0 then 'contact_click'
    when n=3 and g%4=2 then 'outbound_click'
    when n=4 and g%4=0 then 'outbound_click'
    when n=4 and g%4=2 then 'contact_click'
    else 'page_view' end,
  '2026-09-01 10:00:00+00'::timestamptz + ((g%25)||' days')::interval + (n||' minutes')::interval,
  ('f1000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid,n,
  case when g%10=0 then 'preview' else 'production' end,
  case when g%10=0 then 'test' else 'external' end,true,
  case when n=2 and g%4=2 then '/r/TESTA' when n=2 and g%4=1 or n=3 and g%4=2 or n=4 and g%4=0 then '/go/instagram'
    when n=2 and g%4=0 or n=3 and g%4=0 or n=4 and g%4=2 then '/kontakt' else '/' end
from generate_series(1,1000) g cross join generate_series(1,4) n;
analyze public.analytics_events_v2;

prepare segments_base(date,date) as
select count(distinct e.session_id) from public.analytics_events_v2 e
where e.analytics_consent=true and e.schema_version=1
  and public.analytics_reporting_eligible_v1('business',e.environment,e.traffic_class)
  and e.occurred_at >= $1::timestamp at time zone 'Europe/Warsaw'
  and e.occurred_at < $2::timestamp at time zone 'Europe/Warsaw';

prepare segments_counts(date,date) as
with eligible as materialized (
  select e.session_id,e.event_name from public.analytics_events_v2 e
  where e.analytics_consent=true and e.schema_version=1
    and public.analytics_reporting_eligible_v1('business',e.environment,e.traffic_class)
    and e.occurred_at >= $1::timestamp at time zone 'Europe/Warsaw'
    and e.occurred_at < $2::timestamp at time zone 'Europe/Warsaw'
), facts as (
  select session_id,bool_or(event_name in ('contact_click','outbound_click')) key_event,
    bool_or(event_name='contact_click') contact,
    bool_or(event_name='outbound_click') outbound,
    bool_or(event_name='tracking_entry') tracking
  from eligible group by session_id
)
select count(*) base_sessions,count(*) filter(where key_event) key_event_sessions,
  count(*) filter(where contact) contact_sessions,count(*) filter(where outbound) outbound_sessions,
  count(*) filter(where tracking) tracking_sessions from facts;

prepare segments_snapshot(date,date) as
with eligible as materialized (
  select e.session_id,e.event_name from public.analytics_events_v2 e
  where e.analytics_consent=true and e.schema_version=1
    and public.analytics_reporting_eligible_v1('business',e.environment,e.traffic_class)
    and e.occurred_at >= $1::timestamp at time zone 'Europe/Warsaw'
    and e.occurred_at < $2::timestamp at time zone 'Europe/Warsaw'
), facts as (
  select session_id,count(*) filter(where event_name='page_view') page_views,
    count(*) filter(where event_name='contact_click') contacts,
    count(*) filter(where event_name='outbound_click') outbound,
    count(*) filter(where event_name='tracking_entry') tracking
  from eligible group by session_id
)
select count(*) sessions,sum(page_views) page_views,sum(contacts) contacts,
  sum(outbound) outbound,sum(tracking) tracking
from facts where contacts>0;

prepare segments_key_predicate(date,date) as
with eligible as materialized (
  select e.session_id,e.event_name from public.analytics_events_v2 e
  where e.analytics_consent=true and e.schema_version=1
    and public.analytics_reporting_eligible_v1('business',e.environment,e.traffic_class)
    and e.occurred_at >= $1::timestamp at time zone 'Europe/Warsaw'
    and e.occurred_at < $2::timestamp at time zone 'Europe/Warsaw'
)
select count(*) from (select session_id from eligible group by session_id
  having bool_or(event_name in ('contact_click','outbound_click'))) matched;

\echo Business 7 days: base, all counts, selected snapshot, Key Event predicate
explain (analyze,buffers) execute segments_base('2026-09-19','2026-09-26');
explain (analyze,buffers) execute segments_counts('2026-09-19','2026-09-26');
explain (analyze,buffers) execute segments_snapshot('2026-09-19','2026-09-26');
explain (analyze,buffers) execute segments_key_predicate('2026-09-19','2026-09-26');
\echo Business 30 days: base, all counts, selected snapshot, Key Event predicate
explain (analyze,buffers) execute segments_base('2026-08-27','2026-09-26');
explain (analyze,buffers) execute segments_counts('2026-08-27','2026-09-26');
explain (analyze,buffers) execute segments_snapshot('2026-08-27','2026-09-26');
explain (analyze,buffers) execute segments_key_predicate('2026-08-27','2026-09-26');
rollback;
