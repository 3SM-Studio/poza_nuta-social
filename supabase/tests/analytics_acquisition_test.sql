begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

select ok(not has_function_privilege('anon','public.analytics_acquisition_overview_v1(text,date,date,text,integer,integer)','execute'), 'overview is not public');
select ok(not has_function_privilege('authenticated','public.analytics_acquisition_overview_v1(text,date,date,text,integer,integer)','execute'), 'authenticated cannot call privileged overview directly');
select ok(not has_function_privilege('anon','public.analytics_acquisition_detail_v1(text,date,date,text,uuid)','execute'), 'detail is not public');
select ok(not has_function_privilege('authenticated','public.analytics_acquisition_detail_v1(text,date,date,text,uuid)','execute'), 'viewer cannot call privileged detail directly');
select ok(not has_function_privilege('anon','public.analytics_acquisition_event_rows_v1(text,date,date,text)','execute'), 'event row helper is not public');
select ok(has_function_privilege('service_role','public.analytics_acquisition_overview_v1(text,date,date,text,integer,integer)','execute'), 'trusted server can read overview');
select ok((select relrowsecurity from pg_class where oid='public.analytics_cookieless_events'::regclass), 'cookieless RLS stays enabled');
select ok(has_table_privilege('service_role','public.analytics_cookieless_events','select'), 'trusted server can read accepted cookieless events');
select ok(has_table_privilege('service_role','public.analytics_cookieless_events','insert'), 'trusted invoker ingest can insert cookieless events');
select ok(not has_table_privilege('anon','public.analytics_cookieless_events','select'), 'anon has no cookieless read');
select ok(not has_table_privilege('authenticated','public.analytics_cookieless_events','select'), 'authenticated has no cookieless read');
select ok(not has_table_privilege('anon','public.analytics_cookieless_events','insert'), 'anon has no cookieless insert');
select ok((select bool_and(not prosecdef) from pg_proc where proname in ('analytics_ingest_cookieless_v1','analytics_acquisition_event_rows_v1','analytics_acquisition_overview_v1','analytics_acquisition_detail_v1')), 'ingest and acquisition functions are security invoker');
select throws_ok($$select public.analytics_acquisition_overview_v1('poza_nuta','2031-01-10','2031-01-11','arbitrary')$$, 'P0001', 'invalid_acquisition_range', 'invalid scope rejected');

insert into public.campaigns(id,name,slug,status) values
('c1000000-0000-4000-8000-000000000001','Campaign A','campaign-a','archived'),
('c1000000-0000-4000-8000-000000000002','Campaign B','campaign-b','active');
insert into public.analytics_assets(id,campaign_id,slug,label,active) values
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','poster','Poster',false),
('c2000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','story','Story',true);
insert into public.analytics_placements(id,slug,label,active) values
('c3000000-0000-4000-8000-000000000001','venue-door','Venue door',false),
('c3000000-0000-4000-8000-000000000002','venue-table','Venue table',true);
insert into public.tracking_links(id,code,label,campaign_id,asset_id,placement_id,active) values
('c4000000-0000-4000-8000-000000000001','ABCDE','A link','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001',false),
('c4000000-0000-4000-8000-000000000002','FGHJK','B link','c1000000-0000-4000-8000-000000000002',null,null,true),
('c4000000-0000-4000-8000-000000000003','LMNPQ','Z same place','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001',true),
('c4000000-0000-4000-8000-000000000004','RSTUV','Z other place','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000002',true);
insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent) values
('c5000000-0000-4000-8000-000000000001','production','external',true);

insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path,tracking_link_id,campaign_id,asset_id,placement_id,destination_id,destination_slug,utm_campaign) values
('c6000000-0000-4000-8000-000000000001','poza_nuta','tracking_entry','2031-01-09 23:00:00+00','production','external','/r/ABCDE','c4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001',null,null,null),
('c6000000-0000-4000-8000-000000000002','poza_nuta','page_view','2031-01-09 23:00:01+00','production','external','/',null,null,null,null,null,null,'campaign-a'),
('c6000000-0000-4000-8000-000000000003','poza_nuta','contact_click','2031-01-09 23:00:02+00','production','external','/kontakt',null,null,null,null,null,null,null),
('c6000000-0000-4000-8000-000000000004','poza_nuta','outbound_click','2031-01-09 23:00:03+00','production','external','/go/instagram',null,null,null,null,(select id from public.destinations where slug='instagram'),'instagram',null),
('c6000000-0000-4000-8000-000000000005','poza_nuta','tracking_entry','2031-01-10 12:00:00+00','production','external','/r/FGHJK','c4000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000002',null,null,null,null,null),
('c6000000-0000-4000-8000-000000000006','poza_nuta','tracking_entry','2031-01-10 12:01:00+00','preview','external','/r/ABCDE','c4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001',null,null,null),
('c6000000-0000-4000-8000-000000000007','poza_nuta','tracking_entry','2031-01-10 12:02:00+00','production','test','/r/ABCDE','c4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001',null,null,null),
('c6000000-0000-4000-8000-000000000008','other_project','tracking_entry','2031-01-10 12:03:00+00','production','external','/r/ABCDE','c4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',null,null,null,null,null),
('c6000000-0000-4000-8000-000000000009','poza_nuta','tracking_entry','2031-01-10 23:00:00+00','production','external','/r/ABCDE','c4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',null,null,null,null,null);

insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path,observed_context,attributed_context,tracking_link_id,destination_id,destination_slug) values
('c7000000-0000-4000-8000-000000000001','tracking_entry','2031-01-10 10:00:00+00','c5000000-0000-4000-8000-000000000001',1,'production','external',true,'/r/ABCDE',
 '{"campaignId":"c1000000-0000-4000-8000-000000000001","assetId":"c2000000-0000-4000-8000-000000000001","placementId":"c3000000-0000-4000-8000-000000000001"}',
 '{"campaignId":"c1000000-0000-4000-8000-000000000001","trackingLinkId":"c4000000-0000-4000-8000-000000000001","assetId":"c2000000-0000-4000-8000-000000000001","placementId":"c3000000-0000-4000-8000-000000000001"}',
 'c4000000-0000-4000-8000-000000000001',null,null),
('c7000000-0000-4000-8000-000000000002','outbound_click','2031-01-10 10:01:00+00','c5000000-0000-4000-8000-000000000001',2,'production','external',true,'/go/instagram','{}',
 '{"campaignId":"c1000000-0000-4000-8000-000000000001","trackingLinkId":"c4000000-0000-4000-8000-000000000001","assetId":"c2000000-0000-4000-8000-000000000001","placementId":"c3000000-0000-4000-8000-000000000001"}',
 null,(select id from public.destinations where slug='instagram'),'instagram'),
('c7000000-0000-4000-8000-000000000003','contact_click','2031-01-10 10:02:00+00','c5000000-0000-4000-8000-000000000001',3,'production','external',true,'/kontakt','{}',
 '{"campaignId":"c1000000-0000-4000-8000-000000000001"}',null,null,null);
insert into public.analytics_quality_exceptions(project_key,occurred_at,surface,mode,event_name,outcome,reason) values
('poza_nuta','2031-01-10 11:00:00+00','tracking_redirect','cookieless','tracking_entry','duplicate','idempotent_retry'),
('poza_nuta','2031-01-10 11:00:00+00','tracking_redirect','cookieless','tracking_entry','rejected','invalid_event');

set local role service_role;
create temp table acquisition_reports as select
 public.analytics_acquisition_overview_v1('poza_nuta','2031-01-10','2031-01-11','business') business,
 public.analytics_acquisition_overview_v1('poza_nuta','2031-01-10','2031-01-11','diagnostic') diagnostic,
 public.analytics_acquisition_detail_v1('poza_nuta','2031-01-10','2031-01-11','business','c1000000-0000-4000-8000-000000000001') detail;

select is((business->>'totalEvents')::int, 8, 'business counts only accepted production external rows in Warsaw day') from acquisition_reports;
select is((diagnostic->>'totalEvents')::int, 10, 'diagnostic includes preview and test, not other project or next day') from acquisition_reports;
select is((business->>'trackingEntries')::int, 3, 'accepted tracking entries only') from acquisition_reports;
select is((business->>'noCampaignEvents')::int, 3, 'three cookieless events without campaign remain unattributed') from acquisition_reports;
select is((business->>'directEvents')::int, 3, 'direct context is event-owned') from acquisition_reports;
select is((business->>'persistedEvents')::int, 2, 'downstream consented context is separate') from acquisition_reports;
select is((business->'campaigns'->0->>'id'), 'c1000000-0000-4000-8000-000000000001', 'ranking uses campaign ID and stable tie order') from acquisition_reports;
select is((business->'campaigns'->0->>'trackingEntries')::int, 2, 'A ranks by two direct entries') from acquisition_reports;
select is((business->'campaigns'->1->>'trackingEntries')::int, 1, 'B receives only its own link entry') from acquisition_reports;
select is((detail->'campaign'->>'status'), 'archived', 'archived campaign remains in history') from acquisition_reports;
select is((detail->'assets'->0->>'active')::boolean, false, 'inactive asset is visible') from acquisition_reports;
select is((detail->'placements'->0->>'active')::boolean, false, 'inactive placement is visible') from acquisition_reports;
select is((detail->'links'->0->>'active')::boolean, false, 'disabled link is visible') from acquisition_reports;
select is((detail->'links'->0->>'assetId'), 'c2000000-0000-4000-8000-000000000001', 'asset FK is represented') from acquisition_reports;
select is((detail->'links'->0->>'placementId'), 'c3000000-0000-4000-8000-000000000001', 'placement FK is represented') from acquisition_reports;
select is(jsonb_array_length(detail->'assets'), 2, 'campaign can contain multiple assets including one without activity') from acquisition_reports;
select is(jsonb_array_length(detail->'placements'), 2, 'one asset can span multiple placements') from acquisition_reports;
select is(jsonb_array_length(detail->'links'), 3, 'one placement can hold several links') from acquisition_reports;
select is((select sum((m->>'count')::int) from acquisition_reports, jsonb_array_elements(detail->'metrics') m where m->>'kind'='link' and m->>'eventName'='tracking_entry'), 2::bigint, 'tracking link direct entries match A only');
select is((select sum((m->>'count')::int) from acquisition_reports, jsonb_array_elements(detail->'metrics') m where m->>'kind'='destination' and m->>'eventName'='outbound_click'), 1::bigint, 'shared destination does not bring cookieless click into campaign');
select is((select sum((m->>'count')::int) from acquisition_reports, jsonb_array_elements(detail->'metrics') m where m->>'kind'='campaign' and m->>'association'='persisted'), 2::bigint, 'persisted metric stays distinct from direct');

update public.campaigns set name='Renamed A' where id='c1000000-0000-4000-8000-000000000001';
select is((public.analytics_acquisition_overview_v1('poza_nuta','2031-01-10','2031-01-11','business')->'campaigns'->0->>'name'), 'Renamed A', 'rename changes current metadata without splitting ID history');
select is((public.analytics_acquisition_overview_v1('poza_nuta','2031-01-11','2031-01-12','business')->>'trackingEntries')::int, 1, 'Warsaw end boundary excludes exactly 23:00 UTC from prior day');

insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path,observed_context)
values ('c7000000-0000-4000-8000-000000000004','contact_view','2031-01-10 12:10:00+00','c5000000-0000-4000-8000-000000000001',4,'production','external',true,'/kontakt',
  '{"campaignId":"c1000000-0000-4000-8000-000000000099"}');
select is((select count(*) from jsonb_array_elements(public.analytics_acquisition_overview_v1('poza_nuta','2031-01-10','2031-01-11','business')->'campaigns') c where c->>'id'='c1000000-0000-4000-8000-000000000099'), 1::bigint, 'missing related campaign remains visible without crash');
select is((public.analytics_acquisition_detail_v1('poza_nuta','2031-01-10','2031-01-11','business','c1000000-0000-4000-8000-000000000099')->'campaign')::text, 'null', 'missing current campaign metadata is explicit');

insert into public.campaigns(id,name,slug) values ('c1000000-0000-4000-8000-000000000003','Campaign C','campaign-c');
insert into public.tracking_links(id,code,label,campaign_id) values ('c4000000-0000-4000-8000-000000000005','WXYZA','C link','c1000000-0000-4000-8000-000000000003');
insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path,tracking_link_id,campaign_id)
values ('c6000000-0000-4000-8000-000000000010','poza_nuta','tracking_entry','2031-01-10 12:15:00+00','production','external','/r/WXYZA','c4000000-0000-4000-8000-000000000005','c1000000-0000-4000-8000-000000000003');
select is((public.analytics_acquisition_overview_v1('poza_nuta','2031-01-10','2031-01-11','business')->'campaigns'->1->>'id'), 'c1000000-0000-4000-8000-000000000002', 'equal entry ranking is deterministic by stable ID');

insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path,observed_context,attributed_context)
values ('c7000000-0000-4000-8000-000000000005','hub_resumed','2031-01-10 12:16:00+00','c5000000-0000-4000-8000-000000000001',5,'production','external',true,'/','{}',
  '{"campaignId":"c1000000-0000-4000-8000-000000000001"}');
select is((public.analytics_acquisition_overview_v1('poza_nuta','2031-01-10','2031-01-11','business')->>'totalEvents')::int, 11, 'hub_resumed remains in accepted consented population without inflating named click KPIs');

select * from finish();
rollback;
