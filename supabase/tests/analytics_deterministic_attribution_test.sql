begin;
create extension if not exists pgtap with schema extensions;
select plan(43);

select ok((select relrowsecurity from pg_class where oid='public.analytics_events_v2'::regclass), 'consented source RLS');
select ok((select relrowsecurity from pg_class where oid='public.analytics_cookieless_events'::regclass), 'cookieless source RLS');
select ok(not has_table_privilege('anon','public.analytics_events_v2','select'), 'anon cannot read consented source');
select ok(not has_table_privilege('authenticated','public.analytics_cookieless_events','select'), 'authenticated cannot read cookieless source');
select ok(not has_function_privilege('anon','public.analytics_deterministic_attribution_v1(text,date,date,text)','execute'), 'anon cannot execute report');
select ok(not has_function_privilege('authenticated','public.analytics_deterministic_attribution_v1(text,date,date,text)','execute'), 'authenticated cannot execute report');
select ok(has_function_privilege('service_role','public.analytics_deterministic_attribution_v1(text,date,date,text)','execute'), 'server can execute report');
select ok(not has_function_privilege('anon','public.analytics_attribution_context_id_v1(jsonb,text)','execute'), 'helper is not public');
select ok(not has_function_privilege('authenticated','public.analytics_attribution_context_id_v1(jsonb,text)','execute'), 'authenticated cannot execute helper');
select ok((select not prosecdef from pg_proc where oid='public.analytics_deterministic_attribution_v1(text,date,date,text)'::regprocedure), 'report is security invoker');
select is((select pg_get_userbyid(proowner) from pg_proc where oid='public.analytics_deterministic_attribution_v1(text,date,date,text)'::regprocedure),'postgres','report owner');

insert into public.campaigns(id,name,slug,status) values
('d1000000-0000-4000-8000-000000000001','Original A','attribution-a','archived'),
('d1000000-0000-4000-8000-000000000002','Campaign B','attribution-b','active');
insert into public.analytics_assets(id,campaign_id,slug,label) values
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','asset-a','Asset A');
insert into public.analytics_placements(id,slug,label) values
('d3000000-0000-4000-8000-000000000001','place-a','Place A');
insert into public.tracking_links(id,code,label,campaign_id,asset_id,placement_id) values
('d4000000-0000-4000-8000-000000000001','ZXCVB','Link A','d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000001'),
('d4000000-0000-4000-8000-000000000002','QWERT','Link B','d1000000-0000-4000-8000-000000000002',null,null);
insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent) values
('d5000000-0000-4000-8000-000000000001','production','external',true),
('d5000000-0000-4000-8000-000000000002','production','external',true);

-- A direct outcome conflicts with a persisted B context. Two later outcomes in
-- the same session carry the existing persisted A snapshot, each counted once.
insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path,observed_context,attributed_context,tracking_link_id,destination_id,destination_slug) values
('d6000000-0000-4000-8000-000000000001','contact_click','2033-02-10 10:00+00','d5000000-0000-4000-8000-000000000001',1,'production','external',true,'/kontakt',
 '{"source":"poster","campaignId":"d1000000-0000-4000-8000-000000000001","assetId":"d2000000-0000-4000-8000-000000000001","placementId":"d3000000-0000-4000-8000-000000000001","trackingLinkId":"d4000000-0000-4000-8000-000000000001"}',
 '{"source":"other","campaignId":"d1000000-0000-4000-8000-000000000002"}',null,null,null),
('d6000000-0000-4000-8000-000000000002','contact_click','2033-02-10 10:01+00','d5000000-0000-4000-8000-000000000001',2,'production','external',true,'/kontakt','{"source":"direct"}',
 '{"source":"poster","campaignId":"d1000000-0000-4000-8000-000000000001","trackingLinkId":"d4000000-0000-4000-8000-000000000001"}',null,null,null),
('d6000000-0000-4000-8000-000000000003','outbound_click','2033-02-10 10:02+00','d5000000-0000-4000-8000-000000000001',3,'production','external',true,'/go/instagram','{"source":"direct"}',
 '{"source":"poster","campaignId":"d1000000-0000-4000-8000-000000000001","trackingLinkId":"d4000000-0000-4000-8000-000000000001"}',null,(select id from public.destinations where slug='instagram'),'instagram'),
('d6000000-0000-4000-8000-000000000004','contact_click','2033-02-10 10:03+00','d5000000-0000-4000-8000-000000000002',1,'production','external',true,'/kontakt','{}','{}',null,null,null),
('d6000000-0000-4000-8000-000000000005','contact_click','2033-02-10 10:04+00','d5000000-0000-4000-8000-000000000002',2,'production','external',true,'/kontakt',
 '{"source":"newsletter"}','{"source":"poster","campaignId":"d1000000-0000-4000-8000-000000000002"}',null,null,null),
('d6000000-0000-4000-8000-000000000006','tracking_entry','2033-02-10 10:05+00','d5000000-0000-4000-8000-000000000002',3,'production','external',true,'/r/ZXCVB',
 '{"source":"poster","campaignId":"d1000000-0000-4000-8000-000000000001"}','{}','d4000000-0000-4000-8000-000000000001',null,null),
('d6000000-0000-4000-8000-000000000007','contact_view','2033-02-10 10:06+00','d5000000-0000-4000-8000-000000000002',4,'production','external',true,'/kontakt','{}','{}',null,null,null),
('d6000000-0000-4000-8000-000000000008','page_view','2033-02-10 10:07+00','d5000000-0000-4000-8000-000000000002',5,'production','external',true,'/','{}','{}',null,null,null),
('d6000000-0000-4000-8000-000000000009','hub_resumed','2033-02-10 10:08+00','d5000000-0000-4000-8000-000000000002',6,'production','external',true,'/','{}','{}',null,null,null),
('d6000000-0000-4000-8000-000000000010','contact_click','2033-02-10 10:09+00','d5000000-0000-4000-8000-000000000002',7,'preview','external',true,'/kontakt','{}','{}',null,null,null),
('d6000000-0000-4000-8000-000000000011','contact_click','2033-02-10 10:10+00','d5000000-0000-4000-8000-000000000002',8,'production','test',true,'/kontakt','{}','{}',null,null,null),
('d6000000-0000-4000-8000-000000000012','contact_click','2033-02-10 23:00+00','d5000000-0000-4000-8000-000000000002',9,'production','external',true,'/kontakt','{}','{}',null,null,null),
('d6000000-0000-4000-8000-000000000013','contact_click','2033-02-10 10:11+00','d5000000-0000-4000-8000-000000000002',10,'production','external',false,'/kontakt','{}','{}',null,null,null),
('d6000000-0000-4000-8000-000000000014','contact_click','2033-02-10 10:12+00','d5000000-0000-4000-8000-000000000002',11,'production','external',true,'/kontakt','{}','{}',null,null,null);
update public.analytics_events_v2 set schema_version=0 where event_id='d6000000-0000-4000-8000-000000000014';

insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path,tracking_link_id,campaign_id,asset_id,placement_id,referrer_host,utm_source,destination_id,destination_slug) values
('d7000000-0000-4000-8000-000000000001','poza_nuta','tracking_entry','2033-02-10 09:00+00','production','external','/r/ZXCVB','d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',null,null,null,null,null,null),
('d7000000-0000-4000-8000-000000000002','poza_nuta','contact_click','2033-02-10 09:01+00','production','external','/kontakt',null,null,null,null,null,null,null,null),
('d7000000-0000-4000-8000-000000000003','poza_nuta','contact_click','2033-02-10 09:02+00','production','external','/kontakt',null,'d1000000-0000-4000-8000-000000000001',null,null,null,null,null,null),
('d7000000-0000-4000-8000-000000000004','poza_nuta','outbound_click','2033-02-10 09:03+00','production','external','/go/instagram',null,null,null,null,null,null,(select id from public.destinations where slug='instagram'),'instagram'),
('d7000000-0000-4000-8000-000000000005','poza_nuta','contact_click','2033-02-10 09:04+00','production','external','/kontakt',null,null,null,null,null,'newsletter',null,null),
('d7000000-0000-4000-8000-000000000006','poza_nuta','contact_click','2033-02-10 09:05+00','preview','external','/kontakt',null,null,null,null,null,null,null,null);

-- Mutable relation and label may change; event-owned IDs remain authoritative.
update public.tracking_links set campaign_id='d1000000-0000-4000-8000-000000000002',label='Repointed B' where id='d4000000-0000-4000-8000-000000000001';
update public.campaigns set name='Renamed A' where id='d1000000-0000-4000-8000-000000000001';
delete from public.analytics_assets where id='d2000000-0000-4000-8000-000000000001';
insert into public.analytics_quality_exceptions(project_key,occurred_at,surface,mode,event_name,outcome,reason) values
('poza_nuta','2033-02-10 10:00+00','api_track','consented','contact_click','rejected','invalid_event'),
('poza_nuta','2033-02-10 10:00+00','api_track','consented','contact_click','duplicate','idempotent_retry'),
('poza_nuta','2033-02-10 10:00+00','api_track','cookieless','contact_click','filtered','unsupported_mode');

set local role service_role;
select throws_ok($$select public.analytics_deterministic_attribution_v1('other','2033-02-10','2033-02-11','business')$$,'P0001','invalid_attribution_request','project cannot be chosen');
select throws_ok($$select public.analytics_deterministic_attribution_v1('poza_nuta','2033-02-10','2033-02-11','first_touch')$$,'P0001','invalid_attribution_request','arbitrary model/scope rejected');
select throws_ok($$select public.analytics_deterministic_attribution_v1('poza_nuta','2033-02-11','2033-02-10','business')$$,'P0001','invalid_attribution_request','date bounds enforced');

create temp table attribution_reports as select
 public.analytics_deterministic_attribution_v1('poza_nuta','2033-02-10','2033-02-11','business') business,
 public.analytics_deterministic_attribution_v1('poza_nuta','2033-02-10','2033-02-11','diagnostic') diagnostic,
 public.analytics_deterministic_attribution_v1('poza_nuta','2033-02-11','2033-02-12','business') next_day,
 public.analytics_deterministic_attribution_v1('poza_nuta','2033-02-12','2033-02-13','business') empty;

select is((business->'summary'->>'total')::int,9,'only accepted eligible outcome events counted') from attribution_reports;
select is((business->'summary'->>'attributed')::int,6,'six deterministic event credits') from attribution_reports;
select is((business->'summary'->>'unattributed')::int,3,'contextless outcomes remain unattributed') from attribution_reports;
select is((business->'summary'->>'directObserved')::int,4,'direct observed basis') from attribution_reports;
select is((business->'summary'->>'persistedConsented')::int,2,'persisted consented basis') from attribution_reports;
select is((business->'summary'->>'campaignAttributed')::int,4,'campaign IDs only from outcome context') from attribution_reports;
select is((business->'summary'->>'partialContext')::int,2,'source-only direct context stays partial') from attribution_reports;
select is((business->'summary'->>'consentedSessionsWithAttributedOutcome')::int,2,'consented session metric deduplicates') from attribution_reports;
select is((business->'summary'->>'coverage')::numeric,0.6667::numeric,'coverage denominator is all eligible outcomes') from attribution_reports;
select is((business->'summary'->>'total')::int,(business->'summary'->>'attributed')::int+(business->'summary'->>'unattributed')::int,'attributed plus unattributed equals total') from attribution_reports;
select is((business->'summary'->>'attributed')::int,(business->'summary'->>'directObserved')::int+(business->'summary'->>'persistedConsented')::int,'one basis per credited event') from attribution_reports;
select is((select sum((x->>'events')::int)::int from jsonb_array_elements(business->'splits') x where x->>'mode'='cookieless' and x->>'basis'='unattributed'),2,'cookieless entry does not credit later outcome or shared destination') from attribution_reports;
select is((select sum((x->>'events')::int)::int from jsonb_array_elements(business->'splits') x where x->>'mode'='cookieless' and x->>'basis'='direct_observed'),2,'same-event cookieless ID or source is direct') from attribution_reports;
select ok(not exists(select 1 from jsonb_array_elements(business->'splits') x where x->>'mode'='cookieless' and x->>'basis'='persisted_consented'),'cookieless never inherits persisted context') from attribution_reports;
select is((select (x->>'events')::int from jsonb_array_elements(business->'campaigns') x where x->>'id'='d1000000-0000-4000-8000-000000000001'),4,'renamed archived A retains historical credit despite repointed link') from attribution_reports;
select ok(not exists(select 1 from jsonb_array_elements(business->'campaigns') x where x->>'id'='d1000000-0000-4000-8000-000000000002'),'conflicting persisted B and current link B do not receive credit') from attribution_reports;
select is((select x->>'name' from jsonb_array_elements(business->'campaigns') x limit 1),'Renamed A','display name is mutable metadata') from attribution_reports;
select is((select x->>'label' from jsonb_array_elements(business->'graph') x where x->>'entityType'='asset' limit 1),null,'missing metadata does not remove asset ID credit') from attribution_reports;
select is((select sum((x->>'events')::int)::int from jsonb_array_elements(business->'graph') x where x->>'entityType'='tracking_link'),3,'link credit uses event snapshot ID') from attribution_reports;
select is((diagnostic->'summary'->>'total')::int,12,'diagnostic includes preview and test outcomes') from attribution_reports;
select is((next_day->'summary'->>'total')::int,1,'Warsaw exclusive boundary places event next day') from attribution_reports;
select is((empty->'summary'->>'total')::int,0,'empty range total zero') from attribution_reports;
select is(empty->'summary'->>'coverage',null,'empty range coverage is null') from attribution_reports;
select is((select sum((x->>'events')::int)::int from jsonb_array_elements(business->'splits') x where x->>'eventName'='outbound_click'),2,'outbound outcome separate') from attribution_reports;
select is((select sum((x->>'events')::int)::int from jsonb_array_elements(business->'splits') x where x->>'eventName'='contact_click'),7,'contact outcome separate without weights') from attribution_reports;

insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path,observed_context,attributed_context)
values ('d6000000-0000-4000-8000-000000000015','contact_click','2033-02-10 10:15+00','d5000000-0000-4000-8000-000000000002',12,'production','external',true,'/kontakt',
  '{"source":"direct","trackingLinkId":"d4000000-0000-4000-8000-000000000001"}','{}');
select is((public.analytics_deterministic_attribution_v1('poza_nuta','2033-02-10','2033-02-11','business')->'summary'->>'partialContext')::int,3,
  'link-only outcome remains partial despite mutable link to campaign B');
select ok(not exists(select 1 from jsonb_array_elements(public.analytics_deterministic_attribution_v1('poza_nuta','2033-02-10','2033-02-11','business')->'campaigns') x
  where x->>'id'='d1000000-0000-4000-8000-000000000002'), 'link-only context cannot infer campaign from current relation');

insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,path,observed_context,attributed_context)
values ('d6000000-0000-4000-8000-000000000016','contact_click','2033-02-10 10:16+00','d5000000-0000-4000-8000-000000000002',13,'production','external',true,'/kontakt',
  '{"source":"poster","campaignId":"d1000000-0000-4000-8000-000000000002","trackingLinkId":"d4000000-0000-4000-8000-000000000002"}','{}');
select is((public.analytics_deterministic_attribution_v1('poza_nuta','2033-02-10','2033-02-11','business')->>'campaignRows')::int,2,
  'two campaigns have separately proven credits');
select is((public.analytics_deterministic_attribution_v1('poza_nuta','2033-02-10','2033-02-11','business')->'campaigns'->0->>'id'),
  'd1000000-0000-4000-8000-000000000001','campaign ranking uses total event credits');

select * from finish();
rollback;
