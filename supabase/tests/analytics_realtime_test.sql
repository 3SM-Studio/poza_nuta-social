begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

select ok(not has_function_privilege('anon', 'public.analytics_realtime_v2(text,integer,timestamptz,text)', 'execute'), 'anon cannot read realtime RPC');
select ok(not has_function_privilege('authenticated', 'public.analytics_realtime_v2(text,integer,timestamptz,text)', 'execute'), 'authenticated and viewer cannot call privileged RPC directly');
select ok(has_function_privilege('service_role', 'public.analytics_realtime_v2(text,integer,timestamptz,text)', 'execute'), 'trusted server can read realtime RPC');
select throws_ok($$select public.analytics_realtime_v2('poza_nuta', 1440, '2031-01-10 12:30:00+00', 'diagnostic')$$, 'P0001', 'invalid_realtime_window', 'DB rejects historical windows');

set local role service_role;
insert into public.campaigns(id,name,slug) values ('a1000000-0000-4000-8000-000000000001','Kampania testowa','kampania-testowa');
insert into public.tracking_links(id,code,label,campaign_id) values ('a2000000-0000-4000-8000-000000000001','ABCDE','Plakat', 'a1000000-0000-4000-8000-000000000001');
insert into public.analytics_sessions_v2(session_id,environment,traffic_class,analytics_consent,marketing_consent)
values ('a4000000-0000-4000-8000-000000000001','development','external',true,false);

insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path,utm_source,tracking_link_id,campaign_id,destination_id,destination_slug)
values
('a5000000-0000-4000-8000-000000000001','poza_nuta','page_view','2031-01-10 12:00:00+00','development','external','/','newsletter',null,null,null,null),
('a5000000-0000-4000-8000-000000000002','poza_nuta','page_view','2031-01-10 12:01:00+00','development','external','/kontakt',null,null,null,null,null),
('a5000000-0000-4000-8000-000000000003','poza_nuta','contact_click','2031-01-10 12:02:00+00','development','external','/kontakt',null,null,null,null,null),
('a5000000-0000-4000-8000-000000000004','poza_nuta','tracking_entry','2031-01-10 12:03:00+00','development','external','/r/ABCDE',null,'a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',null,null),
('a5000000-0000-4000-8000-000000000005','poza_nuta','outbound_click','2031-01-10 12:04:00+00','development','external','/go/instagram',null,null,null,(select id from public.destinations where slug='instagram'),'instagram'),
('a5000000-0000-4000-8000-000000000006','poza_nuta','page_view','2031-01-10 11:59:59+00','development','external','/',null,null,null,null,null),
('a5000000-0000-4000-8000-000000000007','poza_nuta','page_view','2031-01-10 12:30:00+00','development','external','/',null,null,null,null,null),
('a5000000-0000-4000-8000-000000000008','other_project','page_view','2031-01-10 12:05:00+00','development','external','/',null,null,null,null,null);

insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,marketing_consent,path,observed_context,tracking_link_id,destination_id,destination_slug)
values
('a6000000-0000-4000-8000-000000000001','page_view','2031-01-10 12:06:00+00','a4000000-0000-4000-8000-000000000001',1,'development','external',true,false,'/', '{"source":"google","campaignId":"a1000000-0000-4000-8000-000000000001"}',null,null,null),
('a6000000-0000-4000-8000-000000000002','contact_click','2031-01-10 12:07:00+00','a4000000-0000-4000-8000-000000000001',2,'development','external',true,false,'/kontakt','{}',null,null,null),
('a6000000-0000-4000-8000-000000000003','tracking_entry','2031-01-10 12:08:00+00','a4000000-0000-4000-8000-000000000001',3,'development','external',true,false,'/r/ABCDE','{"campaignId":"a1000000-0000-4000-8000-000000000001"}','a2000000-0000-4000-8000-000000000001',null,null),
('a6000000-0000-4000-8000-000000000004','outbound_click','2031-01-10 12:09:00+00','a4000000-0000-4000-8000-000000000001',4,'development','external',true,false,'/go/instagram','{}',null,(select id from public.destinations where slug='instagram'),'instagram'),
('a6000000-0000-4000-8000-000000000005','page_view','2031-01-10 12:10:00+00','a4000000-0000-4000-8000-000000000001',5,'development','external',true,false,'/kontakt','{}',null,null,null);

insert into public.analytics_quality_exceptions(project_key,occurred_at,surface,mode,event_name,outcome,reason)
values ('poza_nuta','2031-01-10 12:12:00+00','api_track','cookieless','page_view','rejected','invalid_path'),
('poza_nuta','2031-01-10 12:13:00+00','api_track','consented','page_view','duplicate','idempotent_retry');

select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->>'totalEvents')::int, 10, 'total excludes exceptions and other project');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->>'cookielessEvents')::int, 5, 'cookieless accepted count');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->>'consentedEvents')::int, 5, 'consented accepted count');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->>'totalEvents')::int,
  ((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->>'cookielessEvents')::int +
   (public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->>'consentedEvents')::int), 'mode split sums to accepted total');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->'eventCounts'->>'page_view')::int, 4, 'page views count only canonical page_view');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->'eventCounts'->>'contact_click')::int, 2, 'contact clicks count');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->'eventCounts'->>'tracking_entry')::int, 2, 'tracking entries count');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->'eventCounts'->>'outbound_click')::int, 2, 'outbound clicks count');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->>'consentedSessionsWithActivity')::int, 1, 'distinct consented session with activity, no cookieless identity');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->>'qualityExceptions')::int, 2, 'quality exception count remains separate');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->'topPages'->0->>'label'), '/', 'page tie sorted by canonical path');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->'topPages'->1->>'label'), '/kontakt', 'second tied path deterministic');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->'topPages'->0->>'count')::int, 2, 'page ranking uses page_view population');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->'topCampaigns'->0->>'count')::int, 2, 'campaigns count only tracking entries with stored campaign ID');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->'topTrackingLinks'->0->>'count')::int, 2, 'links count tracking entry activity');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->'topDestinations'->0->>'count')::int, 2, 'destinations count outbound choices');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->'observedSources'->0->>'mode'), 'consented', 'source mode remains explicit');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 12:30:00+00','diagnostic')->'observedSources'->1->>'kind'), 'utm_source', 'cookieless source remains an observed UTM signal');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 13:30:00+00','diagnostic')->>'totalEvents')::int, 0, 'empty window has zero events');
select is((public.analytics_realtime_v2('poza_nuta',30,'2031-01-10 13:30:00+00','diagnostic')->>'consentedSessionsWithActivity')::int, 0, 'empty window has zero consented sessions');
select is((public.analytics_realtime_v2('poza_nuta',5,'2031-01-10 12:05:00+00','diagnostic')->>'totalEvents')::int, 5, 'exact lower cutoff included');

select * from finish();
rollback;
