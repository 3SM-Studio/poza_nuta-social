begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

select ok((select relrowsecurity from pg_class where oid='public.analytics_events_v2'::regclass), 'source retains RLS');
select ok(not has_table_privilege('anon','public.analytics_events_v2','select'), 'anon lacks source read');
select ok(not has_table_privilege('authenticated','public.analytics_events_v2','select'), 'authenticated lacks source read');
select ok(not has_function_privilege('anon','public.analytics_consented_segments_v1(text,date,date,text,text)','execute'), 'anon cannot execute');
select ok(not has_function_privilege('authenticated','public.analytics_consented_segments_v1(text,date,date,text,text)','execute'), 'authenticated cannot execute');
select ok(has_function_privilege('service_role','public.analytics_consented_segments_v1(text,date,date,text,text)','execute'), 'service role can execute');
select ok((select not prosecdef from pg_proc where oid='public.analytics_consented_segments_v1(text,date,date,text,text)'::regprocedure), 'security invoker');
select is((select pg_get_userbyid(proowner) from pg_proc where oid='public.analytics_consented_segments_v1(text,date,date,text,text)'::regprocedure),'postgres','postgres owner');

insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent) values
('e1000000-0000-4000-8000-000000000001','production','external',true),
('e1000000-0000-4000-8000-000000000002','production','external',true),
('e1000000-0000-4000-8000-000000000003','production','external',true),
('e1000000-0000-4000-8000-000000000004','preview','test',true),
('e1000000-0000-4000-8000-000000000005','production','external',false);

insert into public.analytics_events_v2(event_id,event_name,schema_version,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path) values
('e2000000-0000-4000-8000-000000000001','page_view',1,'2032-01-09 23:00:00+00','e1000000-0000-4000-8000-000000000001',1,'production','external',true,'/'),
('e2000000-0000-4000-8000-000000000002','contact_click',1,'2032-01-10 10:00:00+00','e1000000-0000-4000-8000-000000000001',2,'preview','test',true,'/kontakt'),
('e2000000-0000-4000-8000-000000000003','tracking_entry',1,'2032-01-09 22:59:59+00','e1000000-0000-4000-8000-000000000001',3,'production','external',true,'/r/TESTA'),
('e2000000-0000-4000-8000-000000000004','page_view',1,'2032-01-10 11:00:00+00','e1000000-0000-4000-8000-000000000002',1,'production','external',true,'/'),
('e2000000-0000-4000-8000-000000000005','contact_click',1,'2032-01-10 11:01:00+00','e1000000-0000-4000-8000-000000000002',2,'production','external',true,'/kontakt'),
('e2000000-0000-4000-8000-000000000006','contact_click',1,'2032-01-10 11:02:00+00','e1000000-0000-4000-8000-000000000002',3,'production','external',true,'/kontakt'),
('e2000000-0000-4000-8000-000000000007','outbound_click',1,'2032-01-10 11:03:00+00','e1000000-0000-4000-8000-000000000002',4,'production','external',true,'/go/instagram'),
('e2000000-0000-4000-8000-000000000008','tracking_entry',1,'2032-01-10 11:04:00+00','e1000000-0000-4000-8000-000000000002',5,'production','external',true,'/r/TESTB'),
('e2000000-0000-4000-8000-000000000009','outbound_click',1,'2032-01-10 12:00:00+00','e1000000-0000-4000-8000-000000000003',1,'production','external',true,'/go/instagram'),
('e2000000-0000-4000-8000-000000000010','contact_click',1,'2032-01-10 23:00:00+00','e1000000-0000-4000-8000-000000000003',2,'production','external',true,'/kontakt'),
('e2000000-0000-4000-8000-000000000011','contact_click',1,'2032-01-10 12:00:00+00','e1000000-0000-4000-8000-000000000004',1,'preview','test',true,'/kontakt'),
('e2000000-0000-4000-8000-000000000012','contact_click',1,'2032-01-10 12:01:00+00','e1000000-0000-4000-8000-000000000005',1,'production','external',false,'/kontakt'),
('e2000000-0000-4000-8000-000000000013','outbound_click',0,'2032-01-10 12:02:00+00','e1000000-0000-4000-8000-000000000001',4,'production','external',true,'/go/instagram'),
('e2000000-0000-4000-8000-000000000014','page_view',1,'2032-01-12 12:00:00+00','e1000000-0000-4000-8000-000000000004',2,'preview','test',true,'/');

insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path,destination_id,destination_slug) values
('e3000000-0000-4000-8000-000000000001','poza_nuta','contact_click','2032-01-10 10:00:00+00','production','external','/kontakt',null,null),
('e3000000-0000-4000-8000-000000000002','poza_nuta','outbound_click','2032-01-10 10:01:00+00','production','external','/go/instagram',(select id from public.destinations where slug='instagram'),'instagram');

set local role service_role;
select throws_ok($$select public.analytics_consented_segments_v1('poza_nuta','2032-01-10','2032-01-11','business','page_view')$$,'P0001','invalid_segments_request','segment key allowlist');
select throws_ok($$select public.analytics_consented_segments_v1('poza_nuta','2032-01-10','2032-01-11','other','key_events')$$,'P0001','invalid_segments_request','scope allowlist');
select throws_ok($$select public.analytics_consented_segments_v1('other','2032-01-10','2032-01-11','business','key_events')$$,'P0001','invalid_segments_request','project key closed');
select throws_ok($$select public.analytics_consented_segments_v1('poza_nuta','2032-01-11','2032-01-10','business','key_events')$$,'P0001','invalid_segments_request','window bounded');

create temp table segment_reports as select
  public.analytics_consented_segments_v1('poza_nuta','2032-01-10','2032-01-11','business','contact_click') business,
  public.analytics_consented_segments_v1('poza_nuta','2032-01-10','2032-01-11','diagnostic','contact_click') diagnostic,
  public.analytics_consented_segments_v1('poza_nuta','2032-01-13','2032-01-14','business','key_events') empty,
  public.analytics_consented_segments_v1('poza_nuta','2032-01-12','2032-01-13','business','key_events') business_empty,
  public.analytics_consented_segments_v1('poza_nuta','2032-01-12','2032-01-13','diagnostic','key_events') diagnostic_populated;

select is((business->>'baseSessions')::int,3,'base contains three accepted consented sessions') from segment_reports;
select is((business->'segments'->0->>'sessions')::int,2,'Key Event sessions use canonical outcomes') from segment_reports;
select is((business->'segments'->1->>'sessions')::int,1,'repeated contact event counts session once') from segment_reports;
select is((business->'segments'->2->>'sessions')::int,2,'outbound sessions count once') from segment_reports;
select is((business->'segments'->3->>'sessions')::int,1,'tracking entry only in selected window') from segment_reports;
select is((select sum((item->>'sessions')::int) from jsonb_array_elements(business->'segments') item),6::bigint,'overlap sum exceeds base') from segment_reports;
select is((business->'selected'->>'sessions')::int,1,'selected segment count') from segment_reports;
select is((business->'selected'->>'contactClickEvents')::int,2,'snapshot event count retains repetitions') from segment_reports;
select is((business->'selected'->>'outboundClickEvents')::int,1,'same session belongs to contact and outbound') from segment_reports;
select is((business->'selected'->>'sessionsWithKeyEvent')::int,1,'snapshot deduplicates Key Event sessions') from segment_reports;
select is((business->'segments'->1->>'key'),'contact_click','stable key not display label') from segment_reports;
select is((diagnostic->>'baseSessions')::int,4,'Diagnostic includes preview test session') from segment_reports;
select is((diagnostic->'segments'->1->>'sessions')::int,3,'Diagnostic includes preview event in existing Business session') from segment_reports;
select is((business->>'fromDate'),'2032-01-10','Warsaw inclusive date retained') from segment_reports;
select is((business->>'toDateExclusive'),'2032-01-11','Warsaw exclusive date retained') from segment_reports;
select is((empty->>'baseSessions')::int,0,'empty population is zero') from segment_reports;
select is((empty->'segments'->0->>'sessions')::int,0,'empty segment is zero') from segment_reports;
select is((empty->'selected'->>'pageViews')::int,0,'empty snapshot is zero') from segment_reports;
select is((business_empty->>'baseSessions')::int,0,'Business can be empty with preview data') from segment_reports;
select is((diagnostic_populated->>'baseSessions')::int,1,'Diagnostic includes preview-only session') from segment_reports;
select ok(not (business ? 'sessionIds') and not (business ? 'visitorIds'),'no identities returned') from segment_reports;

select * from finish();
rollback;
