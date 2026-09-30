begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

select has_column('public','analytics_consent_evidence','environment','consent evidence has environment');
select has_column('public','analytics_quality_exceptions','environment','quality exceptions have environment');
select ok(not has_function_privilege('anon','public.analytics_data_quality_v2(text,date,date,text)','execute'),'public cannot read scoped diagnostics');
select ok(has_function_privilege('service_role','public.analytics_data_quality_v2(text,date,date,text)','execute'),'server can read scoped diagnostics');

set local role service_role;
insert into public.analytics_consent_evidence(id,visitor_id,analytics_enabled,consent_version,environment) values
  ('e1000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001',true,2,'production'),
  ('e1000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000002',true,2,'preview'),
  ('e1000000-0000-4000-8000-000000000003','e2000000-0000-4000-8000-000000000003',false,2,null);
select is((select environment from public.analytics_consent_evidence where id='e1000000-0000-4000-8000-000000000001'),'production','production consent stays production');
select is((select environment from public.analytics_consent_evidence where id='e1000000-0000-4000-8000-000000000002'),'preview','preview consent stays preview');
select is((select environment from public.analytics_consent_evidence where id='e1000000-0000-4000-8000-000000000003'),null::text,'historical unknown consent remains unknown');

insert into public.analytics_quality_exceptions(project_key,occurred_at,surface,outcome,reason,environment) values
  ('poza_nuta','2034-05-01 12:00:00+00','api_track','rejected','invalid_json','production'),
  ('poza_nuta','2034-05-01 12:01:00+00','api_track','rejected','invalid_json','preview'),
  ('poza_nuta','2034-05-01 12:02:00+00','api_track','rejected','invalid_json',null);
select is((public.analytics_data_quality_v2('poza_nuta','2034-05-01','2034-05-02','production')->>'rejected')::int,1,'production diagnostics exclude preview');
select is((public.analytics_data_quality_v2('poza_nuta','2034-05-01','2034-05-02','preview')->>'rejected')::int,1,'preview diagnostics are explicit');
select is((public.analytics_data_quality_v2('poza_nuta','2034-05-01','2034-05-02','unknown')->>'rejected')::int,1,'unclassified historical exception remains inspectable');
select is((public.analytics_data_quality_v2('poza_nuta','2034-05-01','2034-05-02','all')->>'rejected')::int,3,'all-environments diagnostics include historical rows');
select is((public.analytics_realtime_v2('poza_nuta',60,'2034-05-01 12:30:00+00','business')->>'qualityExceptions')::int,1,'Business realtime quality is production-scoped');
select is((public.analytics_realtime_v2('poza_nuta',60,'2034-05-01 12:30:00+00','diagnostic')->>'qualityExceptions')::int,3,'Diagnostic realtime quality includes all environments');

insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent,session_acquisition) values
  ('e3000000-0000-4000-8000-000000000001','production','external',true,'{"channelGroup":"offline","source":"poster"}');
insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path) values
  ('e4000000-0000-4000-8000-000000000001','page_view','2034-05-01 10:00:00+00','e3000000-0000-4000-8000-000000000001',1,'production','external',true,'/karaoke'),
  ('e4000000-0000-4000-8000-000000000002','contact_view','2034-05-01 10:01:00+00','e3000000-0000-4000-8000-000000000001',2,'production','external',true,'/kontakt'),
  ('e4000000-0000-4000-8000-000000000003','contact_click','2034-05-01 10:02:00+00','e3000000-0000-4000-8000-000000000001',3,'production','external',true,'/kontakt');
create temp table business_before on commit drop as select
  public.analytics_dashboard_v2('2034-05-01','2034-05-02') dashboard,
  public.analytics_dashboard_activation_v1('poza_nuta','2034-05-01','2034-05-02') activation,
  public.analytics_marketing_journey_v3('participant','2034-05-01','2034-05-02','business') participant,
  public.analytics_marketing_journey_v3('venue','2034-05-01','2034-05-02','business') venue,
  public.analytics_acquisition_overview_v1('poza_nuta','2034-05-01','2034-05-02','business') acquisition,
  public.analytics_funnel_v1('contact_intent','2034-05-01','2034-05-02','business') contact,
  public.analytics_key_events_v1('poza_nuta','2034-05-01','2034-05-02','business') outcomes;

insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent,session_acquisition) values
  ('e3000000-0000-4000-8000-000000000002','preview','external',true,'{"channelGroup":"offline","source":"poster"}'),
  ('e3000000-0000-4000-8000-000000000003','development','external',true,'{"channelGroup":"offline","source":"poster"}');
insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path) values
  ('e4000000-0000-4000-8000-000000000004','page_view','2034-05-01 10:03:00+00','e3000000-0000-4000-8000-000000000002',1,'preview','external',true,'/karaoke'),
  ('e4000000-0000-4000-8000-000000000005','contact_click','2034-05-01 10:04:00+00','e3000000-0000-4000-8000-000000000002',2,'preview','external',true,'/kontakt'),
  ('e4000000-0000-4000-8000-000000000006','page_view','2034-05-01 10:05:00+00','e3000000-0000-4000-8000-000000000003',1,'development','external',true,'/karaoke');
insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path) values
  ('e5000000-0000-4000-8000-000000000001','poza_nuta','page_view','2034-05-01 10:06:00+00','preview','external','/dla-lokali');

select is(public.analytics_dashboard_v2('2034-05-01','2034-05-02'),dashboard,'Preview and development leave dashboard and rankings identical') from business_before;
select is(public.analytics_dashboard_activation_v1('poza_nuta','2034-05-01','2034-05-02'),activation,'Preview leaves distribution and activation identical') from business_before;
select is(public.analytics_marketing_journey_v3('participant','2034-05-01','2034-05-02','business'),participant,'Preview leaves participant funnel identical') from business_before;
select is(public.analytics_marketing_journey_v3('venue','2034-05-01','2034-05-02','business'),venue,'Preview leaves venue funnel identical') from business_before;
select is(public.analytics_acquisition_overview_v1('poza_nuta','2034-05-01','2034-05-02','business'),acquisition,'Preview leaves channel acquisition identical') from business_before;
select is(public.analytics_funnel_v1('contact_intent','2034-05-01','2034-05-02','business'),contact,'Preview leaves contact intent identical') from business_before;
select is(public.analytics_key_events_v1('poza_nuta','2034-05-01','2034-05-02','business'),outcomes,'Preview leaves outbound outcomes identical') from business_before;

select * from finish();
rollback;
