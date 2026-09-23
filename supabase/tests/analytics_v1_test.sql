begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

select has_table('public','analytics_visitors','visitor table exists');
select has_table('public','analytics_sessions_v2','session v2 table exists');
select has_table('public','analytics_events_v2','event v2 table exists');
select has_table('public','analytics_assets','asset table exists');
select has_table('public','analytics_placements','placement table exists');
select ok((select relrowsecurity from pg_class where oid='public.analytics_events_v2'::regclass),'event RLS is enabled');
select ok(not has_table_privilege('anon','public.analytics_events_v2','select'),'anon cannot read events');
select ok(not has_table_privilege('authenticated','public.analytics_events_v2','insert'),'authenticated cannot insert events');
select ok(has_table_privilege('service_role','public.audit_log','insert'),'service role can append audit rows');
select ok(not has_table_privilege('service_role','public.audit_log','update'),'service role cannot update audit rows');
select ok(not has_table_privilege('service_role','public.analytics_events_v2','update'),'service role cannot update event history');
select is((select count(*)::int from pg_class where oid in (
  'public.analytics_assets'::regclass,'public.analytics_placements'::regclass,'public.analytics_visitors'::regclass,
  'public.analytics_sessions_v2'::regclass,'public.analytics_events_v2'::regclass,'public.analytics_quality_daily'::regclass
) and relrowsecurity),6,'RLS is enabled on every analytics v1 table');
select ok((select count(*) >= 4 from pg_constraint where conrelid='public.analytics_events_v2'::regclass and contype='f'),'event relationships are foreign keys');
select is((select count(*)::int from pg_indexes where schemaname='public' and indexname in (
  'analytics_sessions_v2_visitor_idx','analytics_events_v2_session_idx','analytics_events_v2_tracking_idx','analytics_events_v2_destination_idx'
)),4,'foreign-key access paths have indexes');
select ok((select count(*) > 0 from pg_constraint where conrelid='public.analytics_events_v2'::regclass and contype='u' and pg_get_constraintdef(oid) like '%event_id%'),'event id has a unique constraint');
select ok((select count(*) > 0 from pg_constraint where conrelid='public.analytics_events_v2'::regclass and contype='u' and pg_get_constraintdef(oid) like '%session_id, session_sequence%'),'session sequence is unique per session');
select ok(
  (select count(*) from pg_constraint where conrelid='public.analytics_visitors'::regclass and contype='c' and pg_get_constraintdef(oid) like '%last_seen_at >= first_seen_at%') = 1
  and (select count(*) from pg_constraint where conrelid='public.analytics_sessions_v2'::regclass and contype='c' and pg_get_constraintdef(oid) like '%last_seen_at >= started_at%') = 1
  and (select count(*) from pg_constraint where conrelid='public.analytics_sessions_v2'::regclass and contype='c' and pg_get_constraintdef(oid) like '%expires_at >= last_seen_at%') = 1,
  'visitor and session timestamps cannot move backwards'
);
select ok(not (select prosecdef from pg_proc where oid='public.analytics_ingest_event_v1(uuid,text,uuid,uuid,text,text,boolean,boolean,text,jsonb,jsonb,jsonb,uuid,uuid,text,text,text,text,jsonb)'::regprocedure),'ingest RPC is security invoker');
select ok(not has_function_privilege('anon','public.analytics_ingest_event_v1(uuid,text,uuid,uuid,text,text,boolean,boolean,text,jsonb,jsonb,jsonb,uuid,uuid,text,text,text,text,jsonb)','execute'),'anon cannot execute ingest RPC');
select ok(has_function_privilege('service_role','public.analytics_ingest_event_v1(uuid,text,uuid,uuid,text,text,boolean,boolean,text,jsonb,jsonb,jsonb,uuid,uuid,text,text,text,text,jsonb)','execute'),'service role can execute ingest RPC');
select ok(to_regprocedure('public.analytics_dashboard(timestamp with time zone)') is null and to_regprocedure('public.analytics_dashboard_range(date,date)') is null,'legacy KPI RPCs are removed');
select ok((select pg_get_constraintdef(oid) like '%''/''%' and pg_get_constraintdef(oid) like '%''/kontakt''%' and pg_get_constraintdef(oid) not like '%/admin%' from pg_constraint where conname='tracking_links_landing_path_public'),'tracking-link landing is constrained to public allowlist');
select ok((select pg_get_constraintdef(oid) like '%instagram%' and pg_get_constraintdef(oid) like '%pozanuta%' from pg_constraint where conname='destinations_official_domain'),'official destination domains are database constrained');

set local role service_role;
select is(
  (public.analytics_ingest_event_v1(
    '11111111-1111-4111-8111-111111111111','page_view','22222222-2222-4222-8222-222222222222',null,
    'production','external',false,false,'/',
    '{"channelGroup":"ai_referral","source":"chatgpt","medium":"referral"}',
    '{"channelGroup":"ai_referral","source":"chatgpt","medium":"referral"}',
    '{}',null,null,null,'mobile','chrome','android','{}'
  )->>'sessionSequence')::int,
  1,
  'first event receives sequence one'
);
select ok(
  (public.analytics_ingest_event_v1(
    '11111111-1111-4111-8111-111111111111','page_view','22222222-2222-4222-8222-222222222222',null,
    'production','external',false,false,'/',
    '{"channelGroup":"ai_referral","source":"chatgpt","medium":"referral"}',
    '{"channelGroup":"ai_referral","source":"chatgpt","medium":"referral"}',
    '{}',null,null,null,'mobile','chrome','android','{}'
  )->>'duplicate')::boolean,
  'duplicate event is acknowledged idempotently'
);
select is((select count(*)::int from public.analytics_events_v2 where session_id='22222222-2222-4222-8222-222222222222'),1,'duplicate did not add an event');
select is((select next_sequence from public.analytics_sessions_v2 where session_id='22222222-2222-4222-8222-222222222222'),1,'duplicate did not advance sequence');

select is(
  (public.analytics_ingest_event_v1(
    '44444444-4444-4444-8444-444444444444','page_view','55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666',
    'production','external',true,false,'/',
    '{"channelGroup":"offline","source":"poster","medium":"qr"}',
    '{"channelGroup":"offline","source":"poster","medium":"qr"}',
    '{}',null,null,null,'mobile','safari','ios','{}'
  )->>'sessionSequence')::int,
  1,
  'consented visitor event is stored'
);
select is((select first_acquisition->>'source' from public.analytics_visitors where visitor_id='66666666-6666-4666-8666-666666666666'),'poster','visitor first acquisition is initialized from the effective session acquisition');

select * from finish();
rollback;
