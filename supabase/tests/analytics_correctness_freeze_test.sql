begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

set local role service_role;

insert into public.analytics_sessions_v2 (
  session_id, environment, traffic_class, session_acquisition, current_attribution,
  next_sequence, started_at, last_seen_at, expires_at
) values
  ('f1000000-0000-4000-8000-000000000001','production','external',
   '{"source":"poster","medium":"qr","campaignId":"f9000000-0000-4000-8000-000000000001","assetId":"f9000000-0000-4000-8000-000000000002","placementId":"f9000000-0000-4000-8000-000000000003","trackingLinkId":"f9000000-0000-4000-8000-000000000004"}',
   '{"source":"chatgpt","medium":"referral","campaignId":"f9000000-0000-4000-8000-000000000001"}',5,
   '2040-01-01 10:00+00','2040-01-01 10:05+00','2040-01-01 10:35+00'),
  ('f1000000-0000-4000-8000-000000000002','production','external','{"source":"direct"}','{"source":"direct"}',1,'2040-01-01 10:00+00','2040-01-01 10:01+00','2040-01-01 10:31+00'),
  ('f1000000-0000-4000-8000-000000000003','production','external','{"source":"direct"}','{"source":"direct"}',1,'2040-01-01 10:00+00','2040-01-01 10:01+00','2040-01-01 10:31+00'),
  ('f1000000-0000-4000-8000-000000000004','production','external','{"source":"direct"}','{"source":"direct"}',1,'2040-01-01 10:00+00','2040-01-01 10:01+00','2040-01-01 10:31+00');

insert into public.analytics_events_v2 (
  event_id,event_name,occurred_at,received_at,session_id,session_sequence,environment,traffic_class,path,
  observed_context,attributed_context,dimension_snapshots,destination_slug,metadata
) values
  ('f2000000-0000-4000-8000-000000000001','page_view','2040-01-01 10:00+00','2040-01-01 10:00+00','f1000000-0000-4000-8000-000000000001',1,'production','external','/','{}',
   '{"source":"poster","medium":"qr","campaignId":"f9000000-0000-4000-8000-000000000001","assetId":"f9000000-0000-4000-8000-000000000002","placementId":"f9000000-0000-4000-8000-000000000003","trackingLinkId":"f9000000-0000-4000-8000-000000000004"}',
   '{"campaignLabel":"Karaoke 25 września","assetLabel":"Plakat różowy","placementLabel":"Wejście","trackingLinkLabel":"Plakat · wejście"}',null,'{}'),
  ('f2000000-0000-4000-8000-000000000002','outbound_click','2040-01-01 10:01+00','2040-01-01 10:01+00','f1000000-0000-4000-8000-000000000001',2,'production','external','/go/instagram','{}',
   '{"source":"chatgpt","medium":"referral","campaignId":"f9000000-0000-4000-8000-000000000001","assetId":"f9000000-0000-4000-8000-000000000002","placementId":"f9000000-0000-4000-8000-000000000003","trackingLinkId":"f9000000-0000-4000-8000-000000000004"}',
   '{"campaignLabel":"karaoke-25-wrzesnia","assetLabel":"pink-v2","placementLabel":"entrance","trackingLinkLabel":"later-link","destinationLabel":"Instagram"}','instagram','{}'),
  ('f2000000-0000-4000-8000-000000000003','contact_view','2040-01-01 10:02+00','2040-01-01 10:02+00','f1000000-0000-4000-8000-000000000001',3,'production','external','/kontakt','{}','{"source":"poster"}','{}',null,'{}'),
  ('f2000000-0000-4000-8000-000000000004','contact_click','2040-01-01 10:03+00','2040-01-01 10:03+00','f1000000-0000-4000-8000-000000000001',4,'production','external','/kontakt','{}','{"source":"poster"}','{}',null,'{}'),
  ('f2000000-0000-4000-8000-000000000005','hub_resumed','2040-01-01 10:04+00','2040-01-01 10:04+00','f1000000-0000-4000-8000-000000000001',5,'production','external','/','{}','{"source":"poster"}','{}',null,'{}'),
  ('f2000000-0000-4000-8000-000000000006','hub_resumed','2040-01-01 10:01+00','2040-01-01 10:01+00','f1000000-0000-4000-8000-000000000002',1,'production','external','/','{}','{"source":"direct"}','{}',null,'{}'),
  ('f2000000-0000-4000-8000-000000000007','contact_click','2040-01-01 10:01+00','2040-01-01 10:01+00','f1000000-0000-4000-8000-000000000003',1,'production','external','/kontakt','{}','{"source":"direct"}','{}',null,'{}'),
  ('f2000000-0000-4000-8000-000000000008','contact_click','2040-01-01 10:01+00','2040-01-01 10:01+00','f1000000-0000-4000-8000-000000000004',1,'production','external','/kontakt','{}','{"source":"direct"}','{}',null,'{}');

select is((public.analytics_dashboard_v2('2040-01-01','2040-01-02')->>'sessions')::int,4,'fixture has four eligible sessions');
select is((select sum((row->>'value')::int) from jsonb_array_elements(public.analytics_dashboard_v2('2040-01-01','2040-01-02')->'topSources') row),4::bigint,'source acquisition buckets are mutually exclusive');
select is((select (row->>'value')::int from jsonb_array_elements(public.analytics_dashboard_v2('2040-01-01','2040-01-02')->'topSources') row where row->>'label'='poster'),1,'poster receives the canonical acquired session once');
select is((select count(*)::int from jsonb_array_elements(public.analytics_dashboard_v2('2040-01-01','2040-01-02')->'topSources') row where row->>'label'='chatgpt'),0,'later ChatGPT touch is not a second acquisition bucket');
select is((select (row->>'value')::int from jsonb_array_elements(public.analytics_dashboard_v2('2040-01-01','2040-01-02')->'topCampaigns') row where row->>'label'='Karaoke 25 września'),1,'campaign is grouped by canonical acquisition identity');
select is((select count(*)::int from jsonb_array_elements(public.analytics_dashboard_v2('2040-01-01','2040-01-02')->'topCampaigns') row where row->>'label'='karaoke-25-wrzesnia'),0,'campaign slug touch does not split the campaign label bucket');
select is((select (row->>'value')::int from jsonb_array_elements(public.analytics_dashboard_v2('2040-01-01','2040-01-02')->'topAssets') row where row->>'label'='Plakat różowy'),1,'asset ranking uses canonical acquisition');
select is((select (row->>'value')::int from jsonb_array_elements(public.analytics_dashboard_v2('2040-01-01','2040-01-02')->'topPlacements') row where row->>'label'='Wejście'),1,'placement ranking uses canonical acquisition');
select is((select (row->>'value')::int from jsonb_array_elements(public.analytics_dashboard_v2('2040-01-01','2040-01-02')->'topTrackingLinks') row where row->>'label'='Plakat · wejście'),1,'tracking-link ranking uses canonical acquisition');
select is((public.analytics_dashboard_v2('2040-01-01','2040-01-02')->>'returnToHubSessions')::int,1,'resume-only spoof is excluded from the outbound numerator');
select is((public.analytics_dashboard_v2('2040-01-01','2040-01-02')->>'returnToHubRate')::numeric,100.00,'return-to-hub numerator is a subset of outbound sessions');
select is((public.analytics_dashboard_v2('2040-01-01','2040-01-02')->>'contactClickRate')::numeric,100.00,'contact-click numerator requires a contact view in the same session');

select public.analytics_ingest_event_v1('f3000000-0000-4000-8000-000000000001','page_view','f4000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000001','production','external',true,false,'/','{"source":"direct"}','{"channelGroup":"direct","source":"direct","medium":null}','{}',null,null,null,'desktop','chrome','windows','{}');
select public.analytics_ingest_event_v1('f3000000-0000-4000-8000-000000000002','page_view','f4000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000001','production','external',true,false,'/','{"source":"chatgpt"}','{"channelGroup":"ai_referral","source":"chatgpt","medium":"referral"}','{}',null,null,null,'desktop','chrome','windows','{}');
select is((select session_acquisition->>'source' from public.analytics_sessions_v2 where session_id='f4000000-0000-4000-8000-000000000001'),'chatgpt','session direct fallback upgrades to first eligible non-direct acquisition');
select is((select first_acquisition->>'source' from public.analytics_visitors where visitor_id='f5000000-0000-4000-8000-000000000001'),'direct','visitor first observed acquisition remains immutable');
select is((select attributed_context->>'source' from public.analytics_events_v2 where event_id='f3000000-0000-4000-8000-000000000002'),'chatgpt','touchpoint event retains non-exclusive attributed context');

select public.analytics_ingest_event_v1('f3000000-0000-4000-8000-000000000003','page_view','f4000000-0000-4000-8000-000000000002',null,'production','external',false,false,'/','{"source":"newsletter"}','{"channelGroup":"email","source":"newsletter","medium":"email"}','{}',null,null,null,'desktop','chrome','windows','{}');
select public.analytics_ingest_event_v1('f3000000-0000-4000-8000-000000000004','tracking_entry','f4000000-0000-4000-8000-000000000002',null,'production','external',false,false,'/r/TRUST','{"source":"poster"}','{"channelGroup":"offline","source":"poster","medium":"qr","trackingLinkId":"f9000000-0000-4000-8000-000000000005"}','{}',null,null,null,'desktop','chrome','windows','{}');
select is((select session_acquisition->>'source' from public.analytics_sessions_v2 where session_id='f4000000-0000-4000-8000-000000000002'),'poster','server-trusted owned link replaces weaker client-observed acquisition');

select * from finish();
rollback;
