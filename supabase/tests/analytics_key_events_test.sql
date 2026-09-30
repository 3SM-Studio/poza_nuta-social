begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

select ok((select relrowsecurity from pg_class where oid='public.analytics_events_v2'::regclass), 'consented events retain RLS');
select ok((select relrowsecurity from pg_class where oid='public.analytics_cookieless_events'::regclass), 'cookieless events retain RLS');
select ok(not has_table_privilege('anon','public.analytics_events_v2','select'), 'anon has no consented source read');
select ok(not has_table_privilege('authenticated','public.analytics_cookieless_events','select'), 'authenticated has no cookieless source read');
select ok(not has_function_privilege('anon','public.analytics_key_events_v1(text,date,date,text)','execute'), 'anon cannot execute');
select ok(not has_function_privilege('authenticated','public.analytics_key_events_v1(text,date,date,text)','execute'), 'authenticated cannot execute');
select ok(has_function_privilege('service_role','public.analytics_key_events_v1(text,date,date,text)','execute'), 'server may execute');
select ok((select not prosecdef from pg_proc where oid='public.analytics_key_events_v1(text,date,date,text)'::regprocedure), 'RPC is security invoker');
select is((select pg_get_userbyid(proowner) from pg_proc where oid='public.analytics_key_events_v1(text,date,date,text)'::regprocedure),'postgres','RPC owner is postgres');

insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent)
values ('c1000000-0000-4000-8000-000000000001','production','external',true),
       ('c1000000-0000-4000-8000-000000000002','production','external',true);

insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path)
values
('c2000000-0000-4000-8000-000000000001','contact_click','2032-01-09 22:59:59+00','c1000000-0000-4000-8000-000000000001',1,'production','external',true,'/kontakt'),
('c2000000-0000-4000-8000-000000000002','contact_click','2032-01-10 12:00:00+00','c1000000-0000-4000-8000-000000000001',2,'production','external',true,'/kontakt'),
('c2000000-0000-4000-8000-000000000003','contact_click','2032-01-10 12:01:00+00','c1000000-0000-4000-8000-000000000001',3,'production','external',true,'/kontakt'),
('c2000000-0000-4000-8000-000000000004','contact_click','2032-01-10 12:02:00+00','c1000000-0000-4000-8000-000000000002',1,'production','external',true,'/kontakt'),
('c2000000-0000-4000-8000-000000000005','contact_click','2032-01-10 12:03:00+00','c1000000-0000-4000-8000-000000000002',2,'preview','external',true,'/kontakt'),
('c2000000-0000-4000-8000-000000000006','contact_view','2032-01-10 12:04:00+00','c1000000-0000-4000-8000-000000000002',3,'production','external',true,'/kontakt'),
('c2000000-0000-4000-8000-000000000007','hub_resumed','2032-01-10 12:05:00+00','c1000000-0000-4000-8000-000000000002',4,'production','external',true,'/kontakt'),
('c2000000-0000-4000-8000-000000000008','contact_click','2032-01-10 23:00:00+00','c1000000-0000-4000-8000-000000000001',4,'production','external',true,'/kontakt'),
('c2000000-0000-4000-8000-000000000009','contact_click','2032-01-10 12:06:00+00','c1000000-0000-4000-8000-000000000002',5,'production','external',false,'/kontakt');

insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path,destination_id,destination_slug)
values
('c3000000-0000-4000-8000-000000000001','poza_nuta','contact_click','2032-01-10 10:00:00+00','production','external','/kontakt',null,null),
('c3000000-0000-4000-8000-000000000002','poza_nuta','contact_click','2032-01-10 10:01:00+00','preview','external','/kontakt',null,null),
('c3000000-0000-4000-8000-000000000003','poza_nuta','contact_view','2032-01-10 10:02:00+00','production','external','/kontakt',null,null),
('c3000000-0000-4000-8000-000000000004','poza_nuta','outbound_click','2032-01-10 10:03:00+00','production','external','/go/instagram',(select id from public.destinations where slug='instagram'),'instagram'),
('c3000000-0000-4000-8000-000000000005','poza_nuta','contact_click','2032-01-09 23:00:00+00','production','external','/kontakt',null,null);

insert into public.analytics_quality_exceptions(project_key,occurred_at,surface,mode,event_name,outcome,reason)
values ('poza_nuta','2032-01-10 12:00:00+00','api_track','consented','contact_click','rejected','invalid_event'),
       ('poza_nuta','2032-01-10 12:00:00+00','api_track','consented','contact_click','duplicate','idempotent_retry'),
       ('poza_nuta','2032-01-10 12:00:00+00','api_track','cookieless','contact_click','filtered','unsupported_mode');

set local role service_role;
select throws_ok($$select public.analytics_key_events_v1('poza_nuta','2032-01-10','2032-01-11','other')$$,'P0001','invalid_key_events_request','scope allowlist');
select throws_ok($$select public.analytics_key_events_v1('poza_nuta','2032-01-11','2032-01-10','business')$$,'P0001','invalid_key_events_request','date window bounded');

create temp table key_event_reports as select
  public.analytics_key_events_v1('poza_nuta','2032-01-10','2032-01-11','business') business,
  public.analytics_key_events_v1('poza_nuta','2032-01-10','2032-01-11','diagnostic') diagnostic,
  public.analytics_key_events_v1('poza_nuta','2032-01-11','2032-01-12','business') next_day,
  public.analytics_key_events_v1('poza_nuta','2032-01-12','2032-01-13','business') empty;

select is(business->'outcomes'->0->>'eventName','outbound_click','fixed outcome name, not display label') from key_event_reports;
select is(business->'outcomes'->1->>'eventName','contact_click','second fixed outcome') from key_event_reports;
select is(jsonb_array_length(business->'outcomes'),2,'only explicit outcomes returned') from key_event_reports;
select is((business->'outcomes'->1->>'cookielessEvents')::int,2,'cookieless accepted count includes exact Warsaw start') from key_event_reports;
select is((business->'outcomes'->1->>'consentedEvents')::int,3,'consented accepted count excludes preview and false consent') from key_event_reports;
select is((business->'outcomes'->1->>'acceptedEvents')::int,5,'mode counts sum without dual write') from key_event_reports;
select is((business->'outcomes'->1->>'consentedSessionsWithEvent')::int,2,'repeated events count once per consented session') from key_event_reports;
select is((business->'outcomes'->0->>'cookielessEvents')::int,1,'cookieless-only outcome remains visible') from key_event_reports;
select is((business->'outcomes'->0->>'consentedSessionsWithEvent')::int,0,'cookieless outcome makes no consented session') from key_event_reports;
select is((diagnostic->'outcomes'->1->>'acceptedEvents')::int,7,'diagnostic includes preview in both modes') from key_event_reports;
select is((business->>'scope'),'business','business scope retained') from key_event_reports;
select is((business->>'fromDate'),'2032-01-10','start date retained') from key_event_reports;
select is((business->>'toDateExclusive'),'2032-01-11','exclusive end retained') from key_event_reports;
select is((empty->'outcomes'->1->>'acceptedEvents')::int,0,'empty report returns zero') from key_event_reports;
select is((business->'outcomes'->1->>'acceptedEvents')::int,5,'quality rejection duplicate and filtered observations do not add primary counts') from key_event_reports;
select is((business->'outcomes'->1->>'acceptedEvents')::int,5,'outcome without campaign context still counts') from key_event_reports;
select ok(not (business ? 'attribution') and not (business->'outcomes'->1 ? 'campaignId'),'no synthetic campaign credit') from key_event_reports;
select is((next_day->'outcomes'->1->>'acceptedEvents')::int,1,'event at exclusive end enters the following Warsaw day') from key_event_reports;
select is((business->'outcomes'->1->>'acceptedEvents')::int,5,'earlier event before lower bound stays excluded') from key_event_reports;

select * from finish();
rollback;
