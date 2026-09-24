begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

select ok((select relrowsecurity from pg_class where oid='public.analytics_events_v2'::regclass), 'primary events retain RLS');
select ok(not has_function_privilege('anon','public.analytics_paths_v1(date,date,text,text)','execute'), 'anon cannot execute paths');
select ok(not has_function_privilege('authenticated','public.analytics_paths_v1(date,date,text,text)','execute'), 'authenticated cannot execute paths');
select ok(has_function_privilege('service_role','public.analytics_paths_v1(date,date,text,text)','execute'), 'service role can execute paths');
select ok(not has_table_privilege('anon','public.analytics_events_v2','select'), 'anon has no source read');
select ok(not has_table_privilege('authenticated','public.analytics_events_v2','select'), 'authenticated has no source read');
select ok((select not prosecdef from pg_proc where oid='public.analytics_paths_v1(date,date,text,text)'::regprocedure), 'RPC is security invoker');
select is((select pg_get_userbyid(proowner) from pg_proc where oid='public.analytics_paths_v1(date,date,text,text)'::regprocedure),'postgres','RPC owner is postgres');

insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent)
select ('a5000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'production','external',true from generate_series(1,8) n;

insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path)
select ('a7000000-0000-4000-8000-' || lpad(event_no::text,12,'0'))::uuid,
  event_name, occurred_at::timestamptz,
  ('a5000000-0000-4000-8000-' || lpad(session_no::text,12,'0'))::uuid,
  seq, environment, traffic_class, consent, path
from (values
  (1,1,1,'page_view','2032-01-10 10:00:00+00','production','external',true,'/'),
  (2,1,2,'contact_view','2032-01-10 10:00:00+00','production','external',true,'/kontakt'),
  (3,1,3,'page_view','2032-01-10 10:00:00+00','production','external',true,'/'),
  (4,1,4,'page_view','2032-01-10 10:00:00+00','production','external',true,'/kontakt'),
  (5,2,1,'page_view','2032-01-10 10:01:00+00','production','external',true,'/'),
  (6,2,2,'page_view','2032-01-10 10:02:00+00','production','external',true,'/linki'),
  (7,3,1,'page_view','2032-01-10 10:03:00+00','production','external',true,'/kontakt'),
  (8,4,1,'page_view','2032-01-10 10:04:00+00','production','external',true,'/'),
  (9,4,2,'page_view','2032-01-10 10:05:00+00','preview','external',true,'/kontakt'),
  (10,6,1,'page_view','2032-01-09 22:59:00+00','production','external',true,'/'),
  (11,6,2,'page_view','2032-01-10 12:00:00+00','production','external',true,'/kontakt'),
  (12,6,3,'page_view','2032-01-10 23:00:00+00','production','external',true,'/'),
  (13,7,1,'page_view','2032-01-10 12:00:00+00','production','external',false,'/'),
  (14,8,1,'page_view','2032-01-10 13:00:00+00','production','external',true,'/kontakt'),
  (15,8,2,'page_view','2032-01-10 13:01:00+00','production','external',true,'/')
) fixture(event_no,session_no,seq,event_name,occurred_at,environment,traffic_class,consent,path);

insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path)
values
('a6000000-0000-4000-8000-000000000001','poza_nuta','page_view','2032-01-10 14:00:00+00','production','external','/'),
('a6000000-0000-4000-8000-000000000002','poza_nuta','page_view','2032-01-10 14:01:00+00','production','external','/kontakt');
insert into public.analytics_quality_exceptions(project_key,occurred_at,surface,mode,event_name,outcome,reason)
values
('poza_nuta','2032-01-10 15:00:00+00','api_track','consented','page_view','rejected','invalid_event'),
('poza_nuta','2032-01-10 15:00:00+00','api_track','consented','page_view','duplicate','idempotent_retry'),
('poza_nuta','2032-01-10 15:00:00+00','api_track','consented','page_view','filtered','unsupported_mode');

set local role service_role;
select throws_ok($$select public.analytics_paths_v1('2032-01-10','2032-01-11','business','/kontakt'';drop table x')$$,'P0001','invalid_paths_request','arbitrary SQL path rejected');
select throws_ok($$select public.analytics_paths_v1('2032-01-10','2032-01-11','other',null)$$,'P0001','invalid_paths_request','unknown scope rejected');
select throws_ok($$select public.analytics_paths_v1('2032-01-11','2032-01-10','business',null)$$,'P0001','invalid_paths_request','invalid range rejected');

create temp table path_reports as select
  public.analytics_paths_v1('2032-01-10','2032-01-11','business','/') business_home,
  public.analytics_paths_v1('2032-01-10','2032-01-11','business','/kontakt') business_contact,
  public.analytics_paths_v1('2032-01-10','2032-01-11','diagnostic','/') diagnostic_home,
  public.analytics_paths_v1('2032-01-13','2032-01-14','business','/') empty;

select is((business_home->>'pathSessions')::int,6,'only accepted consented sessions with page views count; cookieless pair does not stitch') from path_reports;
select is((business_home->'entries'->0->>'path'),'/','entry tie sorted by stored path') from path_reports;
select is((business_home->'entries'->0->>'sessions')::int,3,'first observed page counted once per session') from path_reports;
select is((business_home->'entries'->1->>'sessions')::int,3,'first in event window is not necessarily true landing') from path_reports;
select is((business_home->>'selectedSessions')::int,4,'selected first occurrence counts distinct sessions') from path_reports;
select is((business_home->'next'->0->>'path'),'/','repeated page remains next page at equal timestamp by sequence') from path_reports;
select is((business_home->'next'->0->>'sessions')::int,1,'looped session contributes once to next distribution') from path_reports;
select is((business_home->'next'->1->>'path'),'/linki','different session remains separate next step') from path_reports;
select is((business_home->>'noNextInRange')::int,2,'no next in range is counted without claiming exit') from path_reports;
select is((business_home->'previous'->0->>'path'),'/kontakt','previous step is session-scoped') from path_reports;
select is((business_contact->'previous'->0->>'path'),'/','non-path event between pages does not break previous step') from path_reports;
select is((business_contact->>'noNextInRange')::int,3,'later event after window does not become next step') from path_reports;
select is((diagnostic_home->>'pathSessions')::int,6,'diagnostic scope does not create cookieless sessions') from path_reports;
select is((diagnostic_home->'next'->0->>'sessions')::int,1,'diagnostic retains repeated page') from path_reports;
select is((diagnostic_home->'next'->1->>'path'),'/kontakt','diagnostic includes preview next page before sequence') from path_reports;
select is((business_home->'shortPaths'->0->>'sessions')::int,2,'top short prefix counts sessions, not event occurrences') from path_reports;
select is((business_home->'shortPaths'->0->'paths'->0)::text,'"/kontakt"','top short prefix is deterministic') from path_reports;
select ok(exists(select 1 from jsonb_array_elements(business_home->'shortPaths') p where p->'paths' = '["/","/","/kontakt"]'::jsonb),'short prefix retains A A B and depth is bounded') from path_reports;
select ok(jsonb_array_length(business_home->'entries') <= 10 and jsonb_array_length(business_home->'next') <= 10 and jsonb_array_length(business_home->'shortPaths') <= 10,'rankings are bounded') from path_reports;
select is((business_contact->'previous'->0->>'sessions')::int,1,'previous distribution counts a session once') from path_reports;
select is((empty->>'pathSessions')::int,0,'empty population returns zero sessions') from path_reports;
select is(jsonb_array_length(empty->'entries'),0,'empty population has no invented entry') from path_reports;

select * from finish();
rollback;
