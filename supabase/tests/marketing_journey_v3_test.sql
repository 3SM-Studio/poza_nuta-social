begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

select ok(public.analytics_valid_event_path_v1('/karaoke'), 'canonical karaoke path is valid');
select ok(not public.analytics_valid_event_path_v1('/karaoke-trojmiasto'), 'legacy path is not valid for new events');
select ok(not has_function_privilege('anon', 'public.analytics_marketing_journey_v3(text,date,date,text)', 'EXECUTE'), 'public cannot query session journeys');
select ok(not has_function_privilege('authenticated', 'public.admin_tracking_link_create_v3(uuid,text,text,text,uuid,text,text,text,text,text,text,text,text,text)', 'EXECUTE'), 'tracking link mutation remains service-only');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('e3000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-v3@pozanuta.test','',now(),'{}','{}',now(),now());
insert into public.admin_profiles (user_id, role) values ('e3000000-0000-4000-8000-000000000001','owner');
set local role service_role;
select is(public.admin_tracking_link_create_v3(
  'e3000000-0000-4000-8000-000000000001','owner-v3@pozanuta.test','V3D5ST','Poster unit',
  null,'offline','poster','qr',null,null,null,null,'/','poster-007'
)->'row'->>'distribution_unit','poster-007','creation returns the recorded distribution unit');
select is((select distribution_unit from public.tracking_links where code='V3D5ST'),'poster-007','distribution unit persists on the stable tracking link');
select is((select count(*)::int from public.audit_log where action='tracking_link.create' and new_value->>'code'='V3D5ST'),1,'new link and its audit record are atomic');
select throws_ok(
  $$select public.admin_tracking_link_create_v3('e3000000-0000-4000-8000-000000000001','owner-v3@pozanuta.test','V3D5SX','Invalid unit',null,'offline','poster','qr',null,null,null,null,'/','first' || chr(10) || 'second')$$,
  '23514','invalid_distribution_unit','multiline distribution unit is rejected'
);

select throws_ok(
  $$select public.analytics_ingest_event_v1(md5('legacy-v3')::uuid,'page_view',md5('legacy-v3-session')::uuid,null,'development','external',true,false,'/karaoke-trojmiasto','{}','{}','{}',null,null,null,'desktop','chrome','windows','{}')$$,
  'P0001', 'invalid_path', 'legacy path is rejected by the ingest RPC'
);
select throws_ok(
  $$select public.analytics_ingest_cookieless_v1(md5('legacy-v3-cookieless')::uuid,'poza_nuta','page_view','development','external','/karaoke-trojmiasto',null,null,null,null,null,null,null,null,null,null,null,null)$$,
  'P0001', 'invalid_path', 'legacy path is rejected by cookieless ingest'
);
select throws_ok(
  $$select public.analytics_ingest_event_v1(md5('no-consent-v3')::uuid,'cta_click',md5('no-consent-v3-session')::uuid,null,'development','external',false,false,'/','{}','{}','{}',null,null,null,'desktop','chrome','windows','{"ctaId":"home.hero_karaoke"}')$$,
  'P0001', 'consent_required', 'journey event cannot be ingested without consent'
);
select throws_ok(
  $$select public.analytics_ingest_event_v1(md5('no-consent-section-v3')::uuid,'section_view',md5('no-consent-v3-session')::uuid,null,'development','external',false,false,'/','{}','{}','{}',null,null,null,'desktop','chrome','windows','{"sectionId":"home.participation"}')$$,
  'P0001', 'consent_required', 'section exposure cannot be ingested without consent'
);

create temp table marketing_v3_baseline on commit drop as
select public.analytics_marketing_journey_v3('participant',current_date-1,current_date+1,'diagnostic') participant,
       public.analytics_marketing_journey_v3('participant',current_date-1,current_date+1,'business') business,
       public.analytics_marketing_journey_v3('venue',current_date-1,current_date+1,'diagnostic') venue;

do $$
declare
  names text[] := array['cta_click','page_view','cta_click','page_view'];
  paths text[] := array['/','/karaoke','/karaoke','/linki'];
  props jsonb[] := array['{"ctaId":"home.hero_karaoke"}','{}','{"ctaId":"karaoke.current_dates"}','{}']::jsonb[];
  i integer;
begin
  for i in 1..4 loop
    perform public.analytics_ingest_event_v1(
      md5('journey-v3-event-' || i)::uuid,names[i],md5('journey-v3-session')::uuid,null,
      'development','external',true,false,paths[i],
      '{"source":"poster","channelGroup":"offline","trackingLinkId":"link"}'::jsonb,
      '{"source":"poster","channelGroup":"offline","trackingLinkId":"link"}'::jsonb,
      '{}'::jsonb,null,null,null,'desktop','chrome','windows',props[i]
    );
  end loop;
  perform public.analytics_ingest_event_v1(
    md5('journey-v3-proof')::uuid,'section_view',md5('journey-v3-session')::uuid,null,
    'development','external',true,false,'/', '{}','{}','{}',null,null,null,
    'desktop','chrome','windows','{"sectionId":"home.participation"}'
  );
end;
$$;

select is((select count(*)::int from public.analytics_events_v2 where event_name='cta_click' and session_id=md5('journey-v3-session')::uuid),2,'both semantic CTA events are stored');
select is((select count(*)::int from public.analytics_events_v2 where event_name='section_view' and session_id=md5('journey-v3-session')::uuid),1,'one proof exposure is stored');
select is((public.analytics_marketing_journey_v3('participant',current_date-1,current_date+1,'diagnostic')->'steps'->3->>'sessions')::int - (participant->'steps'->3->>'sessions')::int,1,'first-visit journey completes without a consented homepage view') from marketing_v3_baseline;
select is((public.analytics_marketing_journey_v3('participant',current_date-1,current_date+1,'business')->'steps'->3->>'sessions')::int - (business->'steps'->3->>'sessions')::int,0,'development events are excluded from business scope') from marketing_v3_baseline;
select is((public.analytics_marketing_journey_v3('participant',current_date-1,current_date+1,'diagnostic')->>'routeViewSessions')::int - (participant->>'routeViewSessions')::int,1,'karaoke reach is separately countable') from marketing_v3_baseline;
select is((public.analytics_marketing_journey_v3('participant',current_date-1,current_date+1,'diagnostic')->>'proofExposures')::int - (participant->>'proofExposures')::int,1,'proof exposure is separately countable') from marketing_v3_baseline;
select is((public.analytics_marketing_journey_v3('venue',current_date-1,current_date+1,'diagnostic')->'steps'->0->>'sessions')::int - (venue->'steps'->0->>'sessions')::int,0,'participant CTA is not misclassified as venue CTA') from marketing_v3_baseline;

do $$
declare
  names text[] := array['cta_click','page_view','cta_click','contact_view','contact_click','section_view','section_view'];
  paths text[] := array['/','/dla-lokali','/dla-lokali','/kontakt','/kontakt','/','/dla-lokali'];
  props jsonb[] := array[
    '{"ctaId":"home.case_venues"}','{}','{"ctaId":"venues.hero_contact"}','{}','{"contactType":"email"}',
    '{"sectionId":"home.case_study"}','{"sectionId":"venues.case_study"}'
  ]::jsonb[];
  i integer;
begin
  for i in 1..7 loop
    perform public.analytics_ingest_event_v1(
      md5('venue-v3-event-' || i)::uuid,names[i],md5('venue-v3-session')::uuid,null,
      'development','external',true,false,paths[i],
      '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,null,null,null,
      'desktop','chrome','windows',props[i]
    );
  end loop;
end;
$$;

select is((public.analytics_marketing_journey_v3('venue',current_date-1,current_date+1,'diagnostic')->'steps'->4->>'sessions')::int - (venue->'steps'->4->>'sessions')::int,1,'venue journey reaches the existing contact click') from marketing_v3_baseline;
select is((public.analytics_marketing_journey_v3('venue',current_date-1,current_date+1,'diagnostic')->>'routeViewSessions')::int - (venue->>'routeViewSessions')::int,1,'venue route reach is separately countable') from marketing_v3_baseline;
select is((public.analytics_marketing_journey_v3('venue',current_date-1,current_date+1,'diagnostic')->>'proofExposures')::int - (venue->>'proofExposures')::int,1,'homepage venue proof exposure is separately countable') from marketing_v3_baseline;
select is((public.analytics_marketing_journey_v3('venue',current_date-1,current_date+1,'diagnostic')->>'venueProofExposures')::int - (venue->>'venueProofExposures')::int,1,'venue realization exposure is separately countable') from marketing_v3_baseline;
select throws_ok(
  $$select public.analytics_marketing_journey_v3('unknown',current_date-1,current_date+1,'diagnostic')$$,
  'P0001','invalid_journey_request','unknown journey is rejected'
);

select * from finish();
rollback;
