begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select ok(not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'analytics_cookieless_events'
    and column_name in ('visitor_id','session_id','acquisition_id','observed_context','attributed_context','device_type','browser_family','os_family','ip','user_agent')
), 'cookieless storage has no identity, attribution state, device, IP or UA columns');
select ok(not exists (
  select 1 from pg_constraint where conrelid = 'public.analytics_cookieless_events'::regclass and contype = 'f'
    and confrelid in ('public.analytics_visitors'::regclass, 'public.analytics_sessions_v2'::regclass)
), 'cookieless table has no visitor or session relation');
select ok(not exists (
  select 1 from pg_trigger where tgrelid = 'public.analytics_cookieless_events'::regclass and not tgisinternal
), 'cookieless inserts cannot trigger identity creation');
select ok(not has_function_privilege('anon', 'public.analytics_ingest_cookieless_v1(uuid,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,text)', 'EXECUTE'), 'anonymous role cannot call ingest');
select ok(not has_function_privilege('authenticated', 'public.analytics_ingest_cookieless_v1(uuid,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,text)', 'EXECUTE'), 'authenticated role cannot call ingest');

set local role service_role;
select is(public.analytics_ingest_cookieless_v1(md5('cookieless-one')::uuid,'poza_nuta','page_view','development','external','/',null,null,null,null,null,null,null,null,null,null,null,null), true, 'first cookieless event inserted');
select is(public.analytics_ingest_cookieless_v1(md5('cookieless-one')::uuid,'poza_nuta','page_view','development','external','/',null,null,null,null,null,null,null,null,null,null,null,null), false, 'duplicate event ID ignored');
select is(public.analytics_ingest_cookieless_v1(md5('cookieless-two')::uuid,'poza_nuta','contact_view','development','external','/kontakt',null,null,null,null,null,null,null,null,null,null,null,null), true, 'separate event inserted without shared identity');
select is((select count(*)::int from public.analytics_cookieless_events where event_id in (md5('cookieless-one')::uuid, md5('cookieless-two')::uuid)), 2, 'two independent rows stored');
select is((select count(*)::int from public.analytics_sessions_v2 where session_id in (md5('cookieless-one')::uuid, md5('cookieless-two')::uuid)), 0, 'cookieless ingest creates no sessions');
select is((select count(*)::int from public.analytics_visitors where visitor_id in (md5('cookieless-one')::uuid, md5('cookieless-two')::uuid)), 0, 'cookieless ingest creates no visitors');
select is((select count(*)::int from public.analytics_events_v2 where event_id in (md5('cookieless-one')::uuid, md5('cookieless-two')::uuid)), 0, 'cookieless ingest does not dual-write consented events');
select throws_ok(
  $$select public.analytics_ingest_cookieless_v1(md5('bad-hub')::uuid,'poza_nuta','hub_resumed','development','external','/',null,null,null,null,null,null,null,null,null,null,null,null)$$,
  '23514', null, 'hub_resumed rejected at storage boundary'
);
select throws_ok(
  $$select public.analytics_ingest_cookieless_v1(md5('bad-path')::uuid,'poza_nuta','page_view','development','external','/admin',null,null,null,null,null,null,null,null,null,null,null,null)$$,
  '23514', null, 'internal path rejected at storage boundary'
);
select throws_ok(
  $$select public.analytics_ingest_cookieless_v1(md5('bad-contact')::uuid,'poza_nuta','contact_click','development','external','/',null,null,null,null,null,null,null,null,null,null,null,null)$$,
  '23514', null, 'event-specific path enforced by storage'
);
select ok((select count(*) = 2 from public.analytics_cookieless_events
  where event_id in (md5('cookieless-one')::uuid, md5('cookieless-two')::uuid)
    and project_key='poza_nuta'), 'test rows have explicit project context');

select * from finish();
rollback;
