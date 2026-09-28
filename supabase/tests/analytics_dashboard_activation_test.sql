begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select ok(not has_function_privilege('anon','public.analytics_dashboard_activation_v1(text,date,date)','execute'), 'public cannot read activation summary');
select ok(not has_function_privilege('authenticated','public.analytics_dashboard_activation_v1(text,date,date)','execute'), 'membership cannot bypass trusted Admin read');
select ok(has_function_privilege('service_role','public.analytics_dashboard_activation_v1(text,date,date)','execute'), 'trusted Admin server can read activation summary');
select ok((select not prosecdef from pg_proc where oid='public.analytics_dashboard_activation_v1(text,date,date)'::regprocedure), 'summary is security invoker');
select ok((select 'search_path=public' = any(proconfig) from pg_proc where oid='public.analytics_reporting_eligible_v1(text,text,text)'::regprocedure), 'shared reporting predicate has fixed search path');

insert into public.referral_participants(id,display_name) values ('a1000000-0000-4000-8000-000000000001','Partner A');
insert into public.tracking_links(id,code,label,channel_group,source,medium,distribution_unit,referral_participant_id) values
('a2000000-0000-4000-8000-000000000001','AB23C','Poster A','referral','team','referral','plakat-01','a1000000-0000-4000-8000-000000000001');
insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent,session_acquisition) values
('a3000000-0000-4000-8000-000000000001','production','external',true,'{"channelGroup":"ai_referral","source":"chatgpt"}'),
('a3000000-0000-4000-8000-000000000002','production','external',true,'{"channelGroup":"offline","source":"venue"}'),
('a3000000-0000-4000-8000-000000000003','preview','external',true,'{"channelGroup":"offline","source":"venue"}');
insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path,tracking_link_id) values
('a4000000-0000-4000-8000-000000000001','page_view','2031-02-01 11:00:00+00','a3000000-0000-4000-8000-000000000001',1,'production','external',true,'/',null),
('a4000000-0000-4000-8000-000000000002','tracking_entry','2031-02-01 12:00:00+00','a3000000-0000-4000-8000-000000000002',1,'production','external',true,'/r/AB23C','a2000000-0000-4000-8000-000000000001'),
('a4000000-0000-4000-8000-000000000003','page_view','2031-02-01 13:00:00+00','a3000000-0000-4000-8000-000000000003',1,'preview','external',true,'/',null);
insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path,tracking_link_id) values
('a5000000-0000-4000-8000-000000000001','poza_nuta','tracking_entry','2031-02-01 12:01:00+00','production','external','/r/AB23C','a2000000-0000-4000-8000-000000000001'),
('a5000000-0000-4000-8000-000000000002','poza_nuta','tracking_entry','2031-02-01 12:02:00+00','preview','external','/r/AB23C','a2000000-0000-4000-8000-000000000001'),
('a5000000-0000-4000-8000-000000000003','other_project','tracking_entry','2031-02-01 12:03:00+00','production','external','/r/AB23C','a2000000-0000-4000-8000-000000000001'),
('a5000000-0000-4000-8000-000000000004','poza_nuta','tracking_entry','2031-02-01 23:00:00+00','production','external','/r/AB23C','a2000000-0000-4000-8000-000000000001');

set local role service_role;
create temp table activation_report on commit drop as
select public.analytics_dashboard_activation_v1('poza_nuta','2031-02-01','2031-02-02') value;
select is((value->>'consentedSessions')::int,2,'one AI and one offline consented business session') from activation_report;
select is((value->>'trackingEntryEvents')::int,2,'one consented and one cookieless /r event, excluding preview, other project and next Warsaw day') from activation_report;
select is((select (row->>'sessions')::int from activation_report, jsonb_array_elements(value->'channels') row where row->>'key'='ai_referral'),1,'AI referral is its own session channel') ;
select is((select (row->>'sessions')::int from activation_report, jsonb_array_elements(value->'channels') row where row->>'key'='offline'),1,'offline is its own session channel');
select is((value->'distributionUnits'->0->>'label'),'plakat-01 · AB23C','distribution unit retains stable link identity') from activation_report;
select is((value->'distributionUnits'->0->>'entries')::int,2,'distribution unit counts accepted /r events, not sessions') from activation_report;
select is((value->'referralParticipants'->0->>'entries')::int,2,'referral participant counts owned-link entries') from activation_report;
select throws_ok($$select public.analytics_dashboard_activation_v1('poza_nuta','2031-02-02','2031-02-01')$$,'P0001','invalid_dashboard_activation_range','invalid range is rejected');

select * from finish();
rollback;
