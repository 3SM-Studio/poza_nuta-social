begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

select ok(not has_function_privilege('anon', 'public.analytics_realtime_v2(text,integer,timestamptz,text)', 'execute'), 'public cannot read realtime');
select ok(not has_function_privilege('authenticated', 'public.analytics_realtime_v2(text,integer,timestamptz,text)', 'execute'), 'viewer cannot call RPC directly');
select ok(has_function_privilege('service_role', 'public.analytics_realtime_v2(text,integer,timestamptz,text)', 'execute'), 'server can read realtime');
select ok(not has_function_privilege('anon', 'public.analytics_reporting_eligible_v1(text,text,text)', 'execute'), 'predicate not public API');
select is(public.analytics_reporting_eligible_v1('business','production','external'), true, 'explicit production external is business');
select is(public.analytics_reporting_eligible_v1('business','production','test'), false, 'test excluded');
select is(public.analytics_reporting_eligible_v1('business','production','internal'), false, 'internal excluded');
select is(public.analytics_reporting_eligible_v1('business','production','bot'), false, 'bot excluded');
select is(public.analytics_reporting_eligible_v1('business','development','external'), false, 'development excluded');
select is(public.analytics_reporting_eligible_v1('business','preview','external'), false, 'preview excluded');
select is(public.analytics_reporting_eligible_v1('business','staging','external'), false, 'staging excluded');
select is(public.analytics_reporting_eligible_v1('business','unknown','unclassified'), false, 'legacy unknown excluded');
select is(public.analytics_reporting_eligible_v1('business',null,null), false, 'null classification excluded');
select is(public.analytics_reporting_eligible_v1('diagnostic',null,null), true, 'diagnostic includes legacy/null');
select is(public.analytics_reporting_eligible_v1('arbitrary','production','external'), false, 'predicate fails closed');
select throws_ok($$select public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','arbitrary')$$, 'P0001', 'invalid_realtime_window', 'RPC rejects arbitrary scope');

set local role service_role;
insert into public.campaigns(id,name,slug) values ('b1000000-0000-4000-8000-000000000001','Scope campaign','scope-campaign');
insert into public.tracking_links(id,code,label,campaign_id) values ('b2000000-0000-4000-8000-000000000001','ABCDE','Scope link','b1000000-0000-4000-8000-000000000001');
insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent,marketing_consent) values
('b4000000-0000-4000-8000-000000000001','production','external',true,false),
('b4000000-0000-4000-8000-000000000002','production','test',true,false),
('b4000000-0000-4000-8000-000000000003','unknown','unclassified',true,false);

insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path,utm_source,tracking_link_id,campaign_id,destination_id,destination_slug) values
('b5000000-0000-4000-8000-000000000001','poza_nuta','page_view','2031-01-10 12:01:00+00','production','external','/','business',null,null,null,null),
('b5000000-0000-4000-8000-000000000002','poza_nuta','tracking_entry','2031-01-10 12:02:00+00','production','external','/r/ABCDE',null,'b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001',null,null),
('b5000000-0000-4000-8000-000000000003','poza_nuta','outbound_click','2031-01-10 12:03:00+00','production','external','/go/instagram',null,null,null,(select id from public.destinations where slug='instagram'),'instagram'),
('b5000000-0000-4000-8000-000000000004','poza_nuta','page_view','2031-01-10 12:04:00+00','production','test','/kontakt','testing',null,null,null,null),
('b5000000-0000-4000-8000-000000000005','poza_nuta','tracking_entry','2031-01-10 12:05:00+00','production','test','/r/ABCDE',null,'b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001',null,null),
('b5000000-0000-4000-8000-000000000006','poza_nuta','outbound_click','2031-01-10 12:06:00+00','production','test','/go/instagram',null,null,null,(select id from public.destinations where slug='instagram'),'instagram'),
('b5000000-0000-4000-8000-000000000007','poza_nuta','page_view','2031-01-10 12:07:00+00','development','external','/kontakt',null,null,null,null,null),
('b5000000-0000-4000-8000-000000000008','poza_nuta','page_view','2031-01-10 12:08:00+00','production','bot','/kontakt',null,null,null,null,null),
('b5000000-0000-4000-8000-000000000009','poza_nuta','page_view','2031-01-10 12:09:00+00','production','internal','/kontakt',null,null,null,null,null),
('b5000000-0000-4000-8000-000000000010','poza_nuta','page_view','2031-01-10 12:10:00+00','preview','external','/kontakt',null,null,null,null,null);

insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,marketing_consent,path,observed_context,tracking_link_id,destination_id,destination_slug) values
('b6000000-0000-4000-8000-000000000001','page_view','2031-01-10 12:11:00+00','b4000000-0000-4000-8000-000000000001',1,'production','external',true,false,'/','{"source":"organic"}',null,null,null),
('b6000000-0000-4000-8000-000000000002','contact_click','2031-01-10 12:12:00+00','b4000000-0000-4000-8000-000000000001',2,'production','external',true,false,'/kontakt','{}',null,null,null),
('b6000000-0000-4000-8000-000000000003','tracking_entry','2031-01-10 12:13:00+00','b4000000-0000-4000-8000-000000000001',3,'production','external',true,false,'/r/ABCDE','{"campaignId":"b1000000-0000-4000-8000-000000000001"}','b2000000-0000-4000-8000-000000000001',null,null),
('b6000000-0000-4000-8000-000000000004','outbound_click','2031-01-10 12:14:00+00','b4000000-0000-4000-8000-000000000001',4,'production','external',true,false,'/go/instagram','{}',null,(select id from public.destinations where slug='instagram'),'instagram'),
('b6000000-0000-4000-8000-000000000005','page_view','2031-01-10 12:15:00+00','b4000000-0000-4000-8000-000000000002',1,'production','test',true,false,'/kontakt','{"source":"qa"}',null,null,null),
('b6000000-0000-4000-8000-000000000006','tracking_entry','2031-01-10 12:16:00+00','b4000000-0000-4000-8000-000000000002',2,'production','test',true,false,'/r/ABCDE','{"campaignId":"b1000000-0000-4000-8000-000000000001"}','b2000000-0000-4000-8000-000000000001',null,null),
('b6000000-0000-4000-8000-000000000007','outbound_click','2031-01-10 12:17:00+00','b4000000-0000-4000-8000-000000000002',3,'production','test',true,false,'/go/instagram','{}',null,(select id from public.destinations where slug='instagram'),'instagram'),
('b6000000-0000-4000-8000-000000000008','page_view','2031-01-10 12:18:00+00','b4000000-0000-4000-8000-000000000003',1,'unknown','unclassified',true,false,'/kontakt','{}',null,null,null);

insert into public.analytics_quality_exceptions(project_key,occurred_at,surface,mode,event_name,outcome,reason)
values ('poza_nuta','2031-01-10 12:19:00+00','api_track','consented','page_view','duplicate','idempotent_retry');

select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->>'totalEvents')::int, 7, 'business counts only eligible primary events');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->>'totalEvents')::int, 18, 'diagnostic counts all primary events');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->>'cookielessEvents')::int, 3, 'business cookieless split');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->>'consentedEvents')::int, 4, 'business consented split');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->>'totalEvents')::int,
  ((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->>'cookielessEvents')::int +
   (public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->>'consentedEvents')::int), 'business mode split sums to scoped total');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->'eventCounts'->>'page_view')::int, 2, 'business page views use scope');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->>'consentedSessionsWithActivity')::int, 1, 'business session scope');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->'topPages'->0->>'label'), '/', 'technical page excluded from ranking');
select is(jsonb_array_length(public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->'topPages'), 1, 'only business page ranked');
select is(jsonb_array_length(public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->'observedSources'), 2, 'technical sources excluded');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->'topCampaigns'->0->>'count')::int, 2, 'campaign ranking scoped');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->'topTrackingLinks'->0->>'count')::int, 2, 'tracking ranking scoped');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->'topDestinations'->0->>'count')::int, 2, 'destination ranking scoped');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','business')->>'qualityExceptions')::int, 0, 'business quality excludes historical unknown environment');
select is((public.analytics_realtime_v2('poza_nuta',5,'2031-01-10 12:05:00+00','business')->>'totalEvents')::int, 3, 'business lower cutoff remains inclusive');
select is((public.analytics_realtime_v2('poza_nuta',5,'2031-01-10 12:05:00+00','diagnostic')->>'totalEvents')::int, 4, 'diagnostic sees test in same window');
insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path)
values ('b5000000-0000-4000-8000-000000000011','poza_nuta','page_view','2031-01-10 12:27:00+00','development','external','/');
select is((public.analytics_realtime_v2('poza_nuta',5,'2031-01-10 12:30:00+00','business')->>'totalEvents')::int, 0, 'empty business window');
select is((public.analytics_realtime_v2('poza_nuta',5,'2031-01-10 12:30:00+00','diagnostic')->>'totalEvents')::int, 1, 'diagnostic event exists in empty business window');

select * from finish();
rollback;
