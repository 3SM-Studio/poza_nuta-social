begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

select ok((select relrowsecurity from pg_class where oid = 'public.analytics_quality_exceptions'::regclass), 'quality exceptions have RLS enabled');
select ok(not has_table_privilege('anon', 'public.analytics_quality_exceptions', 'select'), 'anon cannot read exceptions');
select ok(not has_table_privilege('anon', 'public.analytics_quality_exceptions', 'insert'), 'anon cannot write exceptions');
select ok(not has_table_privilege('authenticated', 'public.analytics_quality_exceptions', 'select'), 'authenticated cannot read exceptions directly');
select ok(not has_table_privilege('authenticated', 'public.analytics_quality_exceptions', 'insert'), 'viewer does not gain direct write capability');
select ok(not has_function_privilege('anon', 'public.analytics_data_quality_v1(text,date,date)', 'execute'), 'anon cannot execute report RPC');
select ok(not has_function_privilege('authenticated', 'public.analytics_data_quality_v1(text,date,date)', 'execute'), 'authenticated cannot bypass admin route');
select ok(has_function_privilege('service_role', 'public.analytics_data_quality_v1(text,date,date)', 'execute'), 'trusted server can read report');
select is((select count(*)::int from information_schema.columns where table_schema='public' and table_name='analytics_quality_exceptions' and column_name in ('visitor_id','session_id','referrer','user_agent','ip','details','payload')), 0, 'exception schema cannot hold identity or raw payload columns');

set local role service_role;
select throws_ok(
  $$insert into public.analytics_quality_exceptions(project_key,surface,outcome,reason) values ('poza_nuta','api_track','accepted','invalid_json')$$,
  '23514', 'new row for relation "analytics_quality_exceptions" violates check constraint "analytics_quality_exception_reason_check"',
  'accepted events cannot be copied into exception storage'
);
select throws_ok(
  $$insert into public.analytics_quality_exceptions(project_key,surface,outcome,reason) values ('poza_nuta','api_track','rejected','idempotent_retry')$$,
  '23514', 'new row for relation "analytics_quality_exceptions" violates check constraint "analytics_quality_exception_reason_check"',
  'reason must match outcome'
);
select throws_ok(
  $$insert into public.analytics_quality_exceptions(project_key,surface,path,outcome,reason) values ('poza_nuta','api_track','/admin','rejected','invalid_path')$$,
  '23514', 'new row for relation "analytics_quality_exceptions" violates check constraint "analytics_quality_exceptions_path_check"',
  'unvalidated path cannot be persisted'
);
select throws_ok(
  $$insert into public.analytics_quality_exceptions(project_key,surface,outcome,reason) values ('attacker@example.com','api_track','rejected','forbidden_field')$$,
  '23514', 'new row for relation "analytics_quality_exceptions" violates check constraint "analytics_quality_exceptions_project_key_check"',
  'project contract rejects arbitrary string values'
);
insert into public.analytics_sessions_v2 (session_id, environment, traffic_class, analytics_consent, marketing_consent, session_acquisition, current_attribution)
values ('d1000000-0000-4000-8000-000000000001', 'development', 'external', true, false, '{}', '{}');
insert into public.analytics_events_v2 (event_id,event_name,occurred_at,session_id,session_sequence,environment,traffic_class,analytics_consent,marketing_consent,path)
values ('d2000000-0000-4000-8000-000000000001','page_view','2031-01-10 12:00:00+01','d1000000-0000-4000-8000-000000000001',1,'development','external',true,false,'/');
insert into public.analytics_cookieless_events (event_id,project_key,event_name,occurred_at,environment,traffic_class,path)
values ('d3000000-0000-4000-8000-000000000001','poza_nuta','page_view','2031-01-10 12:00:00+01','development','external','/');
insert into public.analytics_cookieless_events (event_id,project_key,event_name,occurred_at,environment,traffic_class,path)
values ('d3000000-0000-4000-8000-000000000002','poza_nuta','page_view','2031-02-10 12:00:00+01','development','external','/');
insert into public.analytics_quality_exceptions (project_key,occurred_at,surface,mode,event_name,outcome,reason)
values ('poza_nuta','2031-01-10 12:00:00+01','api_track',null,null,'rejected','forbidden_field'),
       ('poza_nuta','2031-01-10 12:01:00+01','api_track','cookieless','page_view','duplicate','idempotent_retry');

select is(public.analytics_ingest_cookieless_v1(
  'd3000000-0000-4000-8000-000000000001','poza_nuta','page_view','development','external','/',
  null,null,null,null,null,null,null,null,null,null,null,null
), false, 'cookieless retry is reported as duplicate by the primary RPC');
select is((select count(*)::int from public.analytics_cookieless_events where event_id='d3000000-0000-4000-8000-000000000001'), 1, 'retry never creates a second primary event');

select is((public.analytics_data_quality_v1('poza_nuta','2031-01-10','2031-01-11')->>'persistedCookieless')::int, 1, 'cookieless primary row counted once');
select is((public.analytics_data_quality_v1('poza_nuta','2031-01-10','2031-01-11')->>'persistedConsented')::int, 1, 'consented primary row counted once');
select is((public.analytics_data_quality_v1('poza_nuta','2031-01-10','2031-01-11')->>'persistedTotal')::int, 2, 'total is sum of primary tables, not exception rows');
select is((public.analytics_data_quality_v1('poza_nuta','2031-01-10','2031-01-11')->>'rejected')::int, 1, 'rejection count comes from sanitized exceptions');
select is((public.analytics_data_quality_v1('poza_nuta','2031-01-10','2031-01-11')->>'duplicates')::int, 1, 'duplicate count is independent of persisted count');
select is((public.analytics_data_quality_v1('poza_nuta','2031-01-10','2031-01-11')->'rejectionReasons'->0->>'reason'), 'forbidden_field', 'reason breakdown is deterministic');
select is((public.analytics_data_quality_v1('poza_nuta','2031-01-10','2031-01-11')->>'contractDrift')::int, 0, 'healthy fixture has no detectable drift');
select is((public.analytics_data_quality_v1('poza_nuta','2031-01-11','2031-01-12')->>'persistedTotal')::int, 0, 'date bounds exclude outside events');

select * from finish();
rollback;
