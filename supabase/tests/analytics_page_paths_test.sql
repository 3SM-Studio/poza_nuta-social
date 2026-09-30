begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

select ok(public.analytics_valid_event_path_v1('/r/ABC_12') and public.analytics_valid_event_path_v1('/go/instagram'), 'redirect event paths remain valid');
select ok(not public.analytics_valid_event_path_v1('/admin') and not public.analytics_valid_event_path_v1('/api/track') and not public.analytics_valid_event_path_v1('/auth/callback'), 'internal paths remain invalid');
select ok(not public.analytics_valid_event_path_v1('//evil.example') and not public.analytics_valid_event_path_v1('/privacy/../admin') and not public.analytics_valid_event_path_v1('/unknown'), 'malformed and unknown paths remain invalid');
select ok(public.analytics_valid_event_path_v1('/prywatnosc') and not public.analytics_valid_event_path_v1('/privacy'), 'canonical privacy accepted and legacy privacy rejected');
select ok((select pg_get_constraintdef(oid) like '%analytics_valid_event_path_v1%' from pg_constraint where conrelid='public.analytics_events_v2'::regclass and conname='analytics_events_v2_path_check'), 'event table uses the path validator');
select ok((select pg_get_constraintdef(oid) like '%''/''%' and pg_get_constraintdef(oid) like '%''/kontakt''%' and pg_get_constraintdef(oid) not like '%/privacy%' from pg_constraint where conrelid='public.tracking_links'::regclass and conname='tracking_links_landing_path_public'), 'referral landing constraint remains narrower');

set local role service_role;
do $$
declare
  route text;
begin
  foreach route in array array['/','/karaoke','/dla-lokali','/kontakt','/linki','/prywatnosc','/cookies'] loop
    perform public.analytics_ingest_event_v1(
      md5('analytics-page-event-' || route)::uuid, 'page_view', md5('analytics-page-session-' || route)::uuid, null,
      'development', 'external', true, false, route,
      '{"source":"direct"}'::jsonb, '{"source":"direct"}'::jsonb, '{}'::jsonb,
      null, null, null, 'desktop', 'chrome', 'windows', '{}'::jsonb
    );
  end loop;
end;
$$;

select is((select path from public.analytics_events_v2 where event_id=md5('analytics-page-event-/')::uuid), '/', 'homepage path is persisted');
select is((select path from public.analytics_events_v2 where event_id=md5('analytics-page-event-/karaoke')::uuid), '/karaoke', 'karaoke path is persisted');
select is((select path from public.analytics_events_v2 where event_id=md5('analytics-page-event-/dla-lokali')::uuid), '/dla-lokali', 'venue path is persisted');
select is((select path from public.analytics_events_v2 where event_id=md5('analytics-page-event-/kontakt')::uuid), '/kontakt', 'contact path is persisted');
select is((select path from public.analytics_events_v2 where event_id=md5('analytics-page-event-/linki')::uuid), '/linki', 'link hub path is persisted');
select is((select path from public.analytics_events_v2 where event_id=md5('analytics-page-event-/prywatnosc')::uuid), '/prywatnosc', 'canonical privacy path is persisted');
select is((select path from public.analytics_events_v2 where event_id=md5('analytics-page-event-/cookies')::uuid), '/cookies', 'cookies path is persisted');

select throws_ok(
  $$select public.analytics_ingest_event_v1(md5('invalid-page-event')::uuid, 'page_view', md5('invalid-page-session')::uuid, null, 'development', 'external', true, false, '/admin', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, null, null, null, 'desktop', 'chrome', 'windows', '{}'::jsonb)$$,
  'P0001', 'invalid_path', 'RPC rejects an internal path'
);
select throws_ok(
  $$select public.analytics_ingest_event_v1(md5('legacy-privacy-event')::uuid, 'page_view', md5('legacy-privacy-session')::uuid, null, 'development', 'external', true, false, '/privacy', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, null, null, null, 'desktop', 'chrome', 'windows', '{}'::jsonb)$$,
  'P0001', 'invalid_path', 'RPC rejects the legacy privacy path'
);
select throws_ok(
  $$insert into public.analytics_events_v2 (event_id,event_name,session_id,session_sequence,environment,traffic_class,analytics_consent,marketing_consent,path) values (md5('invalid-direct-event')::uuid,'page_view',md5('analytics-page-session-/')::uuid,99,'development','external',true,false,'/admin')$$,
  '23514', 'new row for relation "analytics_events_v2" violates check constraint "analytics_events_v2_path_check"', 'table constraint rejects an internal path'
);
select throws_ok(
  $$insert into public.analytics_events_v2 (event_id,event_name,session_id,session_sequence,environment,traffic_class,analytics_consent,marketing_consent,path) values (md5('legacy-direct-event')::uuid,'page_view',md5('analytics-page-session-/')::uuid,99,'development','external',true,false,'/privacy')$$,
  '23514', 'new row for relation "analytics_events_v2" violates check constraint "analytics_events_v2_path_check"', 'table constraint rejects a new legacy privacy event'
);
select is((select count(*)::int from public.analytics_events_v2 where event_id=md5('invalid-page-event')::uuid), 0, 'rejected event was not persisted');
select is((select count(*)::int from public.analytics_events_v2 where event_id::text in (select md5('analytics-page-event-' || route)::uuid::text from unnest(array['/','/karaoke','/dla-lokali','/kontakt','/linki','/prywatnosc','/cookies']) route)), 7, 'all seven public page events were stored');

select * from finish();
rollback;
