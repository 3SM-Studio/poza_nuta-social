begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

select ok((select relrowsecurity from pg_class where oid='public.analytics_events_v2'::regclass), 'consented primary table retains RLS');
select ok(not has_function_privilege('anon','public.analytics_funnel_v1(text,date,date,text)','execute'), 'anon cannot execute funnel RPC');
select ok(not has_function_privilege('authenticated','public.analytics_funnel_v1(text,date,date,text)','execute'), 'authenticated cannot execute funnel RPC');
select ok(has_function_privilege('service_role','public.analytics_funnel_v1(text,date,date,text)','execute'), 'service role can execute funnel RPC');
select ok(has_table_privilege('service_role','public.analytics_events_v2','select'), 'invoker has consented event read');
select ok(not has_table_privilege('anon','public.analytics_events_v2','select'), 'anon has no consented event read');
select ok(not has_table_privilege('authenticated','public.analytics_events_v2','select'), 'authenticated has no consented event read');
select ok((select not prosecdef from pg_proc where oid='public.analytics_funnel_v1(text,date,date,text)'::regprocedure), 'funnel RPC is security invoker');

insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent)
select ('f5000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'production','external',true
from generate_series(1,15) n;

insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path)
select ('f7000000-0000-4000-8000-' || lpad(event_no::text,12,'0'))::uuid,
  event_name, occurred_at::timestamptz,
  ('f5000000-0000-4000-8000-' || lpad(session_no::text,12,'0'))::uuid,
  seq, environment, traffic_class, consent,
  case event_name when 'tracking_entry' then '/r/ABCDE'
    when 'page_view' then '/' else '/kontakt' end
from (values
  (1,1,1,'contact_view','2031-01-10 10:00:00+00','production','external',true),
  (2,1,2,'page_view','2031-01-10 10:01:00+00','production','external',true),
  (3,1,3,'contact_click','2031-01-10 10:02:00+00','production','external',true),
  (4,1,4,'contact_view','2031-01-10 10:03:00+00','production','external',true),
  (5,1,5,'contact_click','2031-01-10 10:04:00+00','production','external',true),
  (6,2,1,'contact_click','2031-01-10 10:00:00+00','production','external',true),
  (7,2,2,'contact_view','2031-01-10 10:01:00+00','production','external',true),
  (8,3,1,'tracking_entry','2031-01-10 11:00:00+00','production','external',true),
  (9,3,2,'contact_view','2031-01-10 11:01:00+00','production','external',true),
  (10,3,3,'contact_click','2031-01-10 11:02:00+00','production','external',true),
  (11,4,1,'tracking_entry','2031-01-10 11:00:00+00','production','external',true),
  (12,4,2,'contact_click','2031-01-10 11:01:00+00','production','external',true),
  (13,4,3,'contact_view','2031-01-10 11:02:00+00','production','external',true),
  (14,5,1,'contact_view','2031-01-10 12:00:00+00','preview','external',true),
  (15,5,2,'contact_click','2031-01-10 12:01:00+00','preview','external',true),
  (16,6,1,'contact_view','2031-01-10 12:00:00+00','production','external',true),
  (17,6,2,'contact_click','2031-01-10 12:01:00+00','preview','external',true),
  (18,7,1,'contact_view','2031-01-09 22:59:59+00','production','external',true),
  (19,7,2,'contact_click','2031-01-10 12:00:00+00','production','external',true),
  (20,8,1,'contact_view','2031-01-10 12:00:00+00','production','external',true),
  (21,8,2,'contact_click','2031-01-10 23:00:00+00','production','external',true),
  (22,9,1,'contact_view','2031-01-09 23:00:00+00','production','external',true),
  (23,9,2,'contact_click','2031-01-09 23:00:01+00','production','external',true),
  (24,10,1,'contact_view','2031-01-10 13:00:00+00','production','external',true),
  (25,10,2,'contact_click','2031-01-10 13:00:00+00','production','external',true),
  (26,11,1,'contact_view','2031-01-10 14:00:00+00','production','external',false),
  (27,11,2,'contact_click','2031-01-10 14:01:00+00','production','external',false),
  (28,12,1,'contact_view','2031-01-10 14:00:00+00','production','test',true),
  (29,12,2,'contact_click','2031-01-10 14:01:00+00','production','test',true),
  (30,13,1,'tracking_entry','2031-01-10 15:00:00+00','production','external',true),
  (31,13,2,'contact_view','2031-01-10 15:01:00+00','preview','external',true),
  (32,13,3,'contact_click','2031-01-10 15:02:00+00','production','external',true),
  (33,14,1,'contact_view','2031-01-11 12:00:00+00','production','external',true),
  (34,15,1,'contact_view','2031-01-12 12:00:00+00','production','external',true),
  (35,15,2,'contact_click','2031-01-12 12:01:00+00','production','external',true)
) fixture(event_no,session_no,seq,event_name,occurred_at,environment,traffic_class,consent);

insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path)
values
('f6000000-0000-4000-8000-000000000001','poza_nuta','contact_view','2031-01-10 16:00:00+00','production','external','/kontakt'),
('f6000000-0000-4000-8000-000000000002','poza_nuta','contact_click','2031-01-10 16:01:00+00','production','external','/kontakt');
insert into public.analytics_quality_exceptions(project_key,occurred_at,surface,mode,event_name,outcome,reason)
values
('poza_nuta','2031-01-10 16:00:00+00','api_track','consented','contact_view','rejected','invalid_event'),
('poza_nuta','2031-01-10 16:00:00+00','api_track','consented','contact_click','duplicate','idempotent_retry'),
('poza_nuta','2031-01-10 16:00:00+00','api_track','consented','contact_click','filtered','unsupported_mode');

set local role service_role;
select throws_ok($$select public.analytics_funnel_v1('contact_view,contact_click','2031-01-10','2031-01-11','business')$$,'P0001','invalid_funnel_request','arbitrary event definitions rejected');
select throws_ok($$select public.analytics_funnel_v1('contact_intent','2031-01-10','2031-01-11','other')$$,'P0001','invalid_funnel_request','unknown scope rejected');
select throws_ok($$select public.analytics_funnel_v1('contact_intent','2031-01-11','2031-01-10','business')$$,'P0001','invalid_funnel_request','invalid range rejected');
create temp table funnel_reports as select
  public.analytics_funnel_v1('contact_intent','2031-01-10','2031-01-11','business') business,
  public.analytics_funnel_v1('contact_intent','2031-01-10','2031-01-11','diagnostic') diagnostic,
  public.analytics_funnel_v1('tracked_entry_to_contact','2031-01-10','2031-01-11','business') tracked_business,
  public.analytics_funnel_v1('tracked_entry_to_contact','2031-01-10','2031-01-11','diagnostic') tracked_diagnostic,
  public.analytics_funnel_v1('contact_intent','2031-01-11','2031-01-12','business') full_dropoff,
  public.analytics_funnel_v1('contact_intent','2031-01-12','2031-01-13','business') full_completion,
  public.analytics_funnel_v1('contact_intent','2031-01-13','2031-01-14','business') empty;

select is(business->>'funnelKey','contact_intent','stable key identifies preset') from funnel_reports;
select is((business->>'eligibleSessions')::int,10,'population counts distinct scoped accepted consented sessions') from funnel_reports;
select is((business->>'entrants')::int,8,'only scoped contact_view sessions enter; cookieless and exceptions do not') from funnel_reports;
select is((business->'steps'->0->>'sessions')::int,8,'step 1 counts unique sessions despite repeated views') from funnel_reports;
select is((business->'steps'->1->>'sessions')::int,4,'step 2 requires ordered view then click in same session and window') from funnel_reports;
select is((business->'steps'->1->>'previousSessions')::int,8,'step denominator uses prior unique sessions') from funnel_reports;
select is((business->'steps'->1->>'conversionRate')::numeric,50.0::numeric,'step conversion is 4 / 8') from funnel_reports;
select is((business->'steps'->1->>'dropOff')::int,4,'drop-off is previous minus current sessions') from funnel_reports;
select is((business->'steps'->1->>'dropOffRate')::numeric,50.0::numeric,'drop-off rate is 4 / 8') from funnel_reports;
select is((business->>'completionRate')::numeric,50.0::numeric,'overall completion is last step / entrants') from funnel_reports;
select is((business->'steps'->0->>'key'),'contact_view','step has stable key independent of label') from funnel_reports;
select is((diagnostic->>'entrants')::int,11,'diagnostic includes accepted preview and test consented sessions') from funnel_reports;
select is((diagnostic->'steps'->1->>'sessions')::int,8,'diagnostic applies scope to the whole sequence') from funnel_reports;
select is((tracked_business->>'entrants')::int,3,'three scoped tracking-entry sessions enter long preset') from funnel_reports;
select is((tracked_business->'steps'->1->>'sessions')::int,2,'middle step requires tracking entry first') from funnel_reports;
select is((tracked_business->'steps'->2->>'sessions')::int,1,'third step requires first and second in order') from funnel_reports;
select is((tracked_business->>'completionRate')::numeric,33.3::numeric,'long preset completion uses final / entrants') from funnel_reports;
select is((tracked_diagnostic->'steps'->2->>'sessions')::int,2,'diagnostic can progress through preview middle step') from funnel_reports;
select is((full_dropoff->>'entrants')::int,1,'one session enters isolated next-day funnel') from funnel_reports;
select is((full_dropoff->'steps'->1->>'sessions')::int,0,'click at previous exclusive end does not complete next-day funnel') from funnel_reports;
select is((full_dropoff->'steps'->1->>'conversionRate')::numeric,0::numeric,'full drop-off has valid zero conversion') from funnel_reports;
select is((full_dropoff->'steps'->1->>'dropOff')::int,1,'full drop-off counts one session') from funnel_reports;
select is((full_dropoff->>'completionRate')::numeric,0::numeric,'full drop-off has zero overall completion') from funnel_reports;
select is((full_completion->>'entrants')::int,1,'one session enters isolated full-completion funnel') from funnel_reports;
select is((full_completion->>'completionRate')::numeric,100::numeric,'complete path has 100 percent completion') from funnel_reports;
select is((empty->>'eligibleSessions')::int,0,'empty window has no consented data') from funnel_reports;
select is((empty->>'entrants')::int,0,'empty window has no entrants') from funnel_reports;
select is(empty->>'completionRate',null,'zero denominator has no misleading percentage') from funnel_reports;
select is(empty->'steps'->1->>'conversionRate',null,'zero prior step has no NaN or Infinity') from funnel_reports;
select is(empty->'steps'->1->>'dropOffRate',null,'zero prior step has no drop-off percentage') from funnel_reports;

select * from finish();
rollback;
