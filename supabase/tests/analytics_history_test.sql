begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.campaigns (id,name,slug,status) values
  ('a1000000-0000-4000-8000-000000000001','Original campaign','history-original','active'),
  ('a1000000-0000-4000-8000-000000000002','Replacement campaign','history-replacement','active');
insert into public.analytics_assets (id,campaign_id,slug,label) values
  ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','original-asset','Original asset'),
  ('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','replacement-asset','Replacement asset');
insert into public.analytics_placements (id,slug,label) values
  ('a3000000-0000-4000-8000-000000000001','original-placement','Original placement'),
  ('a3000000-0000-4000-8000-000000000002','replacement-placement','Replacement placement');
insert into public.tracking_links (
  id,code,campaign_id,label,channel_group,source,medium,asset,placement,asset_id,placement_id,landing_path,active
) values (
  'a4000000-0000-4000-8000-000000000001','HST23','a1000000-0000-4000-8000-000000000001','Original link',
  'offline','poster','qr','Original asset','Original placement','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','/',true
);
insert into public.destinations (id,slug,label,url,icon,sort_order,active) values
  ('a5000000-0000-4000-8000-000000000001','tiktok','Original destination','https://www.tiktok.com/@poza.nuta','music',20,true)
on conflict (slug) do update set id=excluded.id,label=excluded.label,url=excluded.url,active=true;
insert into public.analytics_sessions_v2 (
  session_id,environment,traffic_class,session_acquisition,current_attribution,next_sequence,started_at,last_seen_at,expires_at
) values (
  'a6000000-0000-4000-8000-000000000001','production','external',
  '{"channelGroup":"offline","source":"poster","medium":"qr"}',
  '{"channelGroup":"offline","source":"poster","medium":"qr"}',2,
  '2032-01-01 12:00:00+01','2032-01-01 12:05:00+01','2032-01-01 12:35:00+01'
);
insert into public.analytics_events_v2 (
  event_id,event_name,occurred_at,received_at,session_id,session_sequence,environment,traffic_class,path,
  observed_context,attributed_context,dimension_snapshots,tracking_link_id,destination_id,destination_slug,metadata
) values
  ('a7000000-0000-4000-8000-000000000001','tracking_entry','2032-01-01 12:00:00+01','2032-01-01 12:00:00+01','a6000000-0000-4000-8000-000000000001',1,'production','external','/r/HST23',
   '{}','{"channelGroup":"offline","source":"poster","medium":"qr"}',
   '{"campaignLabel":"Original campaign","assetLabel":"Original asset","placementLabel":"Original placement","trackingLinkLabel":"Original link"}',
   'a4000000-0000-4000-8000-000000000001',null,null,'{}'),
  ('a7000000-0000-4000-8000-000000000002','outbound_click','2032-01-01 12:05:00+01','2032-01-01 12:05:00+01','a6000000-0000-4000-8000-000000000001',2,'production','external','/go/tiktok',
   '{}','{"channelGroup":"offline","source":"poster","medium":"qr"}',
   '{"campaignLabel":"Original campaign","assetLabel":"Original asset","placementLabel":"Original placement","trackingLinkLabel":"Original link","destinationLabel":"Original destination","destinationDomain":"www.tiktok.com"}',
   'a4000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','tiktok','{}');

update public.campaigns set name='Renamed campaign',status='archived' where id='a1000000-0000-4000-8000-000000000001';
update public.analytics_assets set label='Renamed asset' where id='a2000000-0000-4000-8000-000000000001';
update public.analytics_placements set label='Renamed placement' where id='a3000000-0000-4000-8000-000000000001';
update public.destinations set label='Renamed destination',url='https://www.tiktok.com/@poza.nuta.new' where id='a5000000-0000-4000-8000-000000000001';
update public.tracking_links set campaign_id='a1000000-0000-4000-8000-000000000002',asset_id='a2000000-0000-4000-8000-000000000002',placement_id='a3000000-0000-4000-8000-000000000002',label='Repointed link' where id='a4000000-0000-4000-8000-000000000001';

set local role service_role;
select is((public.analytics_dashboard_v2('2032-01-01','2032-01-02')->'topCampaigns'->0->>'label'),'Original campaign','campaign snapshot survives rename/archive/repoint');
select is((public.analytics_dashboard_v2('2032-01-01','2032-01-02')->'topAssets'->0->>'label'),'Original asset','asset snapshot survives rename');
select is((public.analytics_dashboard_v2('2032-01-01','2032-01-02')->'topPlacements'->0->>'label'),'Original placement','placement snapshot survives rename');
select is((public.analytics_dashboard_v2('2032-01-01','2032-01-02')->'topDestinations'->0->>'label'),'Original destination','destination snapshot survives label and URL edit');
select is((public.analytics_dashboard_v2('2032-01-01','2032-01-02')->'topTrackingLinks'->0->>'label'),'Original link','tracking-link snapshot survives repoint');
select is((select dimension_snapshots->>'destinationDomain' from public.analytics_events_v2 where event_id='a7000000-0000-4000-8000-000000000002'),'www.tiktok.com','historical destination domain remains original');
select is((select attributed_context->>'source' from public.analytics_events_v2 where event_id='a7000000-0000-4000-8000-000000000001'),'poster','historical attributed source remains original');

select * from finish();
rollback;
