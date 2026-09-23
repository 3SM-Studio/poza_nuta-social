begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into public.analytics_sessions_v2 (
  session_id, environment, traffic_class, analytics_consent, marketing_consent,
  session_acquisition, current_attribution, next_sequence, started_at, last_seen_at, expires_at
)
select md5('metric-current-session-' || g)::uuid, 'production', 'external', false, false,
  '{"channelGroup":"offline","source":"poster","medium":"qr"}',
  '{"channelGroup":"offline","source":"poster","medium":"qr"}',
  case when g <= 40 then 3 when g <= 80 then 2 else 1 end,
  '2030-01-01 12:00:00+01', '2030-01-01 12:05:00+01', '2030-01-01 12:35:00+01'
from generate_series(1,100) g;

insert into public.analytics_events_v2 (
  event_id, event_name, occurred_at, received_at, session_id, session_sequence,
  environment, traffic_class, analytics_consent, marketing_consent, path,
  observed_context, attributed_context, dimension_snapshots, destination_slug, metadata
)
select md5('metric-page-' || g)::uuid, 'page_view', '2030-01-01 12:00:00+01', '2030-01-01 12:00:00+01',
  md5('metric-current-session-' || g)::uuid, 1, 'production', 'external', false, false, '/',
  '{}', '{"channelGroup":"offline","source":"poster","medium":"qr"}',
  '{"campaignLabel":"Known campaign","assetLabel":"Known asset","placementLabel":"Known placement"}', null, '{}'
from generate_series(1,100) g;

insert into public.analytics_events_v2 (
  event_id, event_name, occurred_at, received_at, session_id, session_sequence,
  environment, traffic_class, analytics_consent, marketing_consent, path,
  observed_context, attributed_context, dimension_snapshots, destination_slug, metadata
)
select md5('metric-outbound-1-' || g)::uuid, 'outbound_click', '2030-01-01 12:01:00+01', '2030-01-01 12:01:00+01',
  md5('metric-current-session-' || g)::uuid, 2, 'production', 'external', false, false, '/go/instagram',
  '{}', '{"channelGroup":"offline","source":"poster","medium":"qr"}',
  '{"campaignLabel":"Known campaign","assetLabel":"Known asset","placementLabel":"Known placement","destinationLabel":"Instagram"}', 'instagram', '{}'
from generate_series(1,80) g;

insert into public.analytics_events_v2 (
  event_id, event_name, occurred_at, received_at, session_id, session_sequence,
  environment, traffic_class, analytics_consent, marketing_consent, path,
  observed_context, attributed_context, dimension_snapshots, destination_slug, metadata
)
select md5('metric-outbound-2-' || g)::uuid, 'outbound_click', '2030-01-01 12:02:00+01', '2030-01-01 12:02:00+01',
  md5('metric-current-session-' || g)::uuid, 3, 'production', 'external', false, false, '/go/tiktok',
  '{}', '{"channelGroup":"offline","source":"poster","medium":"qr"}',
  '{"campaignLabel":"Known campaign","assetLabel":"Known asset","placementLabel":"Known placement","destinationLabel":"TikTok"}', 'tiktok', '{}'
from generate_series(1,40) g;

insert into public.analytics_sessions_v2 (
  session_id, environment, traffic_class, session_acquisition, current_attribution,
  next_sequence, started_at, last_seen_at, expires_at
)
select md5('metric-excluded-session-' || class || '-' || g)::uuid,
  case when class='development' then 'development' else 'production' end,
  case when class='development' then 'external' else class end,
  '{}', '{}', 1, '2030-01-01 12:00:00+01', '2030-01-01 12:00:00+01', '2030-01-01 12:30:00+01'
from unnest(array['bot','internal','test','development']) class cross join generate_series(1,3) g;

insert into public.analytics_events_v2 (
  event_id, event_name, occurred_at, received_at, session_id, session_sequence,
  environment, traffic_class, path, observed_context, attributed_context, dimension_snapshots, metadata
)
select md5('metric-excluded-event-' || class || '-' || g)::uuid, 'outbound_click', '2030-01-01 12:00:00+01', '2030-01-01 12:00:00+01',
  md5('metric-excluded-session-' || class || '-' || g)::uuid, 1,
  case when class='development' then 'development' else 'production' end,
  case when class='development' then 'external' else class end,
  '/go/instagram', '{}', '{}', '{}', '{}'
from unnest(array['bot','internal','test','development']) class cross join generate_series(1,3) g;

insert into public.analytics_sessions_v2 (
  session_id, environment, traffic_class, session_acquisition, current_attribution,
  next_sequence, started_at, last_seen_at, expires_at
)
select md5('metric-previous-session-' || g)::uuid, 'production', 'external', '{}', '{}',
  case when g <= 25 then 2 else 1 end, '2029-12-31 12:00:00+01', '2029-12-31 12:05:00+01', '2029-12-31 12:35:00+01'
from generate_series(1,50) g;

insert into public.analytics_events_v2 (
  event_id, event_name, occurred_at, received_at, session_id, session_sequence,
  environment, traffic_class, path, observed_context, attributed_context, dimension_snapshots, metadata
)
select md5('metric-previous-page-' || g)::uuid, 'page_view', '2029-12-31 12:00:00+01', '2029-12-31 12:00:00+01',
  md5('metric-previous-session-' || g)::uuid, 1, 'production', 'external', '/', '{}', '{}', '{}', '{}'
from generate_series(1,50) g;

insert into public.analytics_events_v2 (
  event_id, event_name, occurred_at, received_at, session_id, session_sequence,
  environment, traffic_class, path, observed_context, attributed_context, dimension_snapshots, destination_slug, metadata
)
select md5('metric-previous-outbound-' || g)::uuid, 'outbound_click', '2029-12-31 12:01:00+01', '2029-12-31 12:01:00+01',
  md5('metric-previous-session-' || g)::uuid, 2, 'production', 'external', '/go/instagram', '{}', '{}', '{}', 'instagram', '{}'
from generate_series(1,25) g;

insert into public.analytics_sessions_v2 (
  session_id, environment, traffic_class, session_acquisition, current_attribution,
  next_sequence, started_at, last_seen_at, expires_at
) values (
  md5('metric-warsaw-boundary-session')::uuid,'production','external','{}','{}',1,
  '2030-01-31 23:30:00+00','2030-01-31 23:30:00+00','2030-02-01 00:00:00+00'
);
insert into public.analytics_events_v2 (
  event_id,event_name,occurred_at,received_at,session_id,session_sequence,environment,traffic_class,path,
  observed_context,attributed_context,dimension_snapshots,metadata
) values (
  md5('metric-warsaw-boundary-event')::uuid,'page_view','2030-01-31 23:30:00+00','2030-01-31 23:30:00+00',
  md5('metric-warsaw-boundary-session')::uuid,1,'production','external','/','{}','{}','{}','{}'
);

set local role service_role;

select is((public.analytics_dashboard_v2('2030-01-01','2030-01-02')->>'sessions')::int,100,'100 eligible sessions');
select is((public.analytics_dashboard_v2('2030-01-01','2030-01-02')->>'outboundSessions')::int,80,'80 outbound sessions');
select is((public.analytics_dashboard_v2('2030-01-01','2030-01-02')->>'outboundSessionRate')::numeric,80.00,'outbound session rate is 80 percent');
select is((public.analytics_dashboard_v2('2030-01-01','2030-01-02')->>'outboundClicks')::int,120,'120 outbound clicks');
select is((public.analytics_dashboard_v2('2030-01-01','2030-01-02')->>'clicksPerOutboundSession')::numeric,1.50,'clicks per outbound session is 1.5');
select is((public.analytics_dashboard_v2('2030-01-01','2030-01-02')->>'multiDestinationSessions')::int,40,'40 multi-destination sessions');
select is((public.analytics_dashboard_v2('2030-01-01','2030-01-02')->>'multiDestinationSessionRate')::numeric,50.00,'multi-destination rate uses outbound sessions as denominator');
select is((public.analytics_dashboard_v2('2030-01-01','2030-01-02')->'topAssets'->0->>'value')::int,100,'asset ranking uses unique sessions');
select is((public.analytics_dashboard_v2('2030-01-01','2030-01-02')->'topPlacements'->0->>'value')::int,100,'placement ranking uses unique sessions');
select is((public.analytics_dashboard_v2('2030-01-01','2030-01-02')->'topDestinations'->0->>'value')::int,80,'destination ranking is labeled click volume');
select is((public.analytics_dashboard_v2('2029-12-31','2030-01-01')->>'sessions')::int,50,'previous period has 50 sessions');
select is((public.analytics_dashboard_v2('2029-12-31','2030-01-01')->>'outboundSessions')::int,25,'previous period has 25 outbound sessions');
select is((public.analytics_dashboard_v2('2031-01-01','2031-01-02')->>'sessions')::int,0,'empty range has no traffic');
select is((public.analytics_dashboard_v2('2031-01-01','2031-01-02')->>'outboundSessionRate')::numeric,0::numeric,'zero session denominator is safe');
select is((public.analytics_dashboard_v2('2031-01-01','2031-01-02')->>'clicksPerOutboundSession')::numeric,0::numeric,'zero outbound denominator is safe');
select is((public.analytics_dashboard_v2('2030-01-01','2030-01-02')->'trafficBreakdown'->0->>'label'),'external','default metric remains external while breakdown stays inspectable');
select is((public.analytics_dashboard_v2('2030-02-01','2030-02-02')->>'sessions')::int,1,'UTC late-night event belongs to next Warsaw calendar day');
select is((public.analytics_dashboard_v2('2030-01-31','2030-02-01')->>'sessions')::int,0,'Warsaw boundary excludes event from prior calendar day');

select * from finish();
rollback;
