begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- The test clock is fixed; the function only accepts an as_of no later than now.
create temp table retention_clock as select clock_timestamp() - interval '1 second' as t;

select is((select pg_get_userbyid(proowner) from pg_proc where oid='retention.run(timestamptz,integer,boolean)'::regprocedure), 'postgres', 'retention owner is postgres');
select ok((select prosecdef from pg_proc where oid='retention.run(timestamptz,integer,boolean)'::regprocedure), 'entrypoint is security definer');
select is((select proconfig[1] from pg_proc where oid='retention.run(timestamptz,integer,boolean)'::regprocedure), 'search_path=""', 'fixed empty search path');
select ok(not has_function_privilege('anon','retention.run(timestamptz,integer,boolean)','execute'), 'anon cannot run retention');
select ok(not has_function_privilege('authenticated','retention.run(timestamptz,integer,boolean)','execute'), 'authenticated cannot run retention');
select ok(has_function_privilege('service_role','retention.run(timestamptz,integer,boolean)','execute'), 'service role can run retention');
select ok(not has_schema_privilege('anon','retention','usage'), 'retention schema is private');
select ok(not has_table_privilege('service_role','retention.legacy_migration_gate','insert'), 'service role cannot open legacy gate');
select is((select count(*)::int from information_schema.columns where table_schema='public' and table_name='analytics_quality_daily' and column_name in ('visitor_id','session_id','user_id','auth_user_id')),0,'quality daily has no identity columns');
select ok(coalesce((select bool_and(route='ingest') from public.analytics_quality_daily),true), 'quality daily has no nonaggregate route');
select has_column('public','analytics_consent_evidence','expires_at','180-day evidence marker preserved');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select 'f1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','retention-owner@pozanuta.test','',t,'{}','{}',t,t from retention_clock;

insert into public.analytics_visitors(visitor_id,first_acquisition,first_seen_at,last_seen_at,first_acquisition_at)
select id, jsonb_build_object('source','qr'), t - interval '14 months',
  case when id='f2000000-0000-4000-8000-000000000002' then t - interval '1 day' else t - interval '13 months' end,
  t - interval '14 months'
from retention_clock cross join (values
  ('f2000000-0000-4000-8000-000000000001'::uuid),
  ('f2000000-0000-4000-8000-000000000002'::uuid),
  ('f2000000-0000-4000-8000-000000000003'::uuid),
  ('f2000000-0000-4000-8000-000000000004'::uuid),
  ('f2000000-0000-4000-8000-000000000005'::uuid)) ids(id);

insert into public.analytics_sessions_v2(session_id,visitor_id,environment,traffic_class,analytics_consent,session_acquisition,current_attribution,started_at,last_seen_at,expires_at,session_acquisition_at,current_attribution_at)
select s.id,s.visitor_id,'production','external',true,'{"source":"qr"}'::jsonb,'{"source":"qr"}'::jsonb,
  s.started,s.seen,s.seen + interval '30 minutes',s.started,s.seen
from retention_clock c cross join lateral (values
  ('f3000000-0000-4000-8000-000000000001'::uuid,'f2000000-0000-4000-8000-000000000001'::uuid,c.t - interval '14 months',c.t - interval '13 months'),
  ('f3000000-0000-4000-8000-000000000002'::uuid,'f2000000-0000-4000-8000-000000000002'::uuid,c.t - interval '14 months',c.t - interval '1 day'),
  ('f3000000-0000-4000-8000-000000000003'::uuid,'f2000000-0000-4000-8000-000000000003'::uuid,c.t - interval '14 months',c.t - interval '13 months'),
  ('f3000000-0000-4000-8000-000000000004'::uuid,'f2000000-0000-4000-8000-000000000004'::uuid,c.t - interval '14 months',c.t - interval '13 months')
) s(id,visitor_id,started,seen);

-- Exact cutoff is retained; one microsecond older is eligible.
insert into public.analytics_events_v2(event_id,event_name,occurred_at,session_id,visitor_id,session_sequence,environment,traffic_class,analytics_consent,path)
select e.id,'page_view',e.at,e.session_id,e.visitor_id,e.seq,'production','external',true,'/'
from retention_clock c cross join lateral (values
  ('f4000000-0000-4000-8000-000000000001'::uuid,c.t - interval '12 months' - interval '1 microsecond','f3000000-0000-4000-8000-000000000001'::uuid,'f2000000-0000-4000-8000-000000000001'::uuid,1),
  ('f4000000-0000-4000-8000-000000000002'::uuid,c.t - interval '12 months','f3000000-0000-4000-8000-000000000003'::uuid,'f2000000-0000-4000-8000-000000000003'::uuid,1),
  ('f4000000-0000-4000-8000-000000000003'::uuid,c.t - interval '1 day','f3000000-0000-4000-8000-000000000004'::uuid,'f2000000-0000-4000-8000-000000000004'::uuid,1)
) e(id,at,session_id,visitor_id,seq);

insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path)
select e.id,'poza_nuta','page_view',e.at,'production','external','/'
from retention_clock c cross join lateral (values
  ('f5000000-0000-4000-8000-000000000001'::uuid,c.t - interval '90 days' - interval '1 microsecond'),
  ('f5000000-0000-4000-8000-000000000002'::uuid,c.t - interval '90 days'),
  ('f5000000-0000-4000-8000-000000000003'::uuid,c.t - interval '89 days')
) e(id,at);
select is((select count(*)::int from public.analytics_cookieless_events where event_id::text like 'f500%'),3,'cookieless fixture has all three boundaries');

insert into public.analytics_consent_evidence(id,visitor_id,analytics_enabled,consent_version,occurred_at,expires_at)
select e.id,e.visitor_id,e.enabled,1,e.at,e.at + interval '180 days'
from retention_clock c cross join lateral (values
  ('f6000000-0000-4000-8000-000000000001'::uuid,'f2000000-0000-4000-8000-000000000001'::uuid,true,c.t - interval '25 months'),
  ('f6000000-0000-4000-8000-000000000002'::uuid,'f2000000-0000-4000-8000-000000000001'::uuid,false,c.t - interval '1 month'),
  ('f6000000-0000-4000-8000-000000000003'::uuid,'f2000000-0000-4000-8000-000000000003'::uuid,true,c.t - interval '25 months'),
  ('f6000000-0000-4000-8000-000000000004'::uuid,'f2000000-0000-4000-8000-000000000005'::uuid,true,c.t - interval '24 months')
) e(id,visitor_id,enabled,at);
select ok((select expires_at < t from public.analytics_consent_evidence,retention_clock where id='f6000000-0000-4000-8000-000000000001'), 'operational marker may expire while evidence stays retained');

insert into public.analytics_quality_exceptions(project_key,occurred_at,surface,outcome,reason)
select 'poza_nuta',e.at,'api_track','rejected','invalid_json'
from retention_clock c cross join lateral (values (c.t - interval '31 days'),(c.t - interval '30 days')) e(at);
insert into public.analytics_quality_daily(metric_date,environment,metric_name,route,value)
select (t - interval '25 months')::date,'production','retention_old','ingest',1 from retention_clock
union all select (t - interval '1 day')::date,'production','retention_new','ingest',1 from retention_clock;
insert into public.audit_log(action,entity_type,created_at)
select 'retention.fixture','test',e.at
from retention_clock c cross join lateral (values (c.t - interval '25 months'),(c.t - interval '23 months')) e(at);

insert into public.admin_invitations(id,email,role,status,invited_by,created_at,expires_at,accepted_at,revoked_at,last_attempt_at,expired_at)
select i.id,i.email,'viewer',i.status,'f1000000-0000-4000-8000-000000000001',c.t - interval '120 days',c.t - interval '110 days',
  case when i.status='accepted' then c.t - interval '100 days' end,
  case when i.status='revoked' then c.t - interval '100 days' end,
  case when i.status='failed' then c.t - interval '100 days' end,
  case when i.status='expired' then c.t - interval '100 days' end
from retention_clock c cross join (values
  ('f7000000-0000-4000-8000-000000000001'::uuid,'retention-pending@pozanuta.test','pending'),
  ('f7000000-0000-4000-8000-000000000002'::uuid,'retention-failed@pozanuta.test','failed'),
  ('f7000000-0000-4000-8000-000000000003'::uuid,'retention-accepted@pozanuta.test','accepted'),
  ('f7000000-0000-4000-8000-000000000004'::uuid,'retention-expired@pozanuta.test','expired'),
  ('f7000000-0000-4000-8000-000000000005'::uuid,'retention-revoked@pozanuta.test','revoked')
) i(id,email,status);
insert into public.admin_invitations(id,email,role,status,invited_by,created_at,expires_at,last_attempt_at)
select 'f7000000-0000-4000-8000-000000000006','retention-failed-boundary@pozanuta.test','viewer','failed',
  'f1000000-0000-4000-8000-000000000001',t - interval '100 days',t - interval '95 days',t - interval '90 days'
from retention_clock;

create temp table retention_dry as select retention.run((select t from retention_clock),100,true) result;
select is((result->'eligible'->>'cookieless_events')::int,1,'dry-run: one cookieless event older than cutoff') from retention_dry;
select is((result->'eligible'->>'raw_events')::int,1,'dry-run: one old raw event') from retention_dry;
select is((result->'eligible'->>'consent_evidence')::int,1,'dry-run: newer withdrawal protects old grant') from retention_dry;
select is((result->'eligible'->>'admin_invitations')::int,4,'dry-run: four terminal invitations eligible') from retention_dry;
select is((result->'eligible'->>'pending_to_expire')::int,1,'dry-run: pending is transition candidate only') from retention_dry;
select is((result->>'legacyGateOpen')::boolean,false,'legacy gate is closed') from retention_dry;
select is((select count(*)::int from retention.purge_runs),0,'dry-run creates no run record');
select is((select count(*)::int from public.analytics_cookieless_events where event_id::text like 'f500%'),3,'dry-run does not delete rows');
select is((select count(*)::int from public.admin_invitations where id::text like 'f700%'),6,'dry-run does not change invitations');

set local role service_role;
select lives_ok($$select retention.run(clock_timestamp() - interval '1 second',100,true)$$,'service role dry-run works');
reset role;
create temp table retention_real as select retention.run((select t from retention_clock),100,false) result;
select is((result->'deletedOrScrubbed'->>'cookieless_events')::int,1,'purge reports cookieless deletion') from retention_real;
select is((result->'deletedOrScrubbed'->>'raw_events')::int,1,'purge reports old raw deletion') from retention_real;
select is((result->'deletedOrScrubbed'->>'quality_exceptions')::int,1,'purge reports diagnostic deletion') from retention_real;
select is((result->'deletedOrScrubbed'->>'quality_daily')::int,1,'purge reports aggregate deletion') from retention_real;
select is((result->'deletedOrScrubbed'->>'admin_audit')::int,1,'purge reports audit deletion') from retention_real;
select is((result->'deletedOrScrubbed'->>'consent_evidence')::int,1,'purge reports evidence deletion') from retention_real;
select is((result->'deletedOrScrubbed'->>'admin_invitations')::int,4,'purge reports terminal invitation deletion') from retention_real;
select is((result->'deletedOrScrubbed'->>'pending_to_expire')::int,1,'pending invitation transitioned') from retention_real;
select is((result->'deletedOrScrubbed'->>'empty_sessions')::int,0,'session with event at run start waits for next invocation') from retention_real;
select is((result->'deletedOrScrubbed'->>'visitors')::int,1,'only stale unprotected visitor removed') from retention_real;
select is((select count(*)::int from public.analytics_cookieless_events where event_id::text like 'f500%'),2,'exact and inside cookieless boundaries survive');
select is((select count(*)::int from public.analytics_events_v2 where event_id::text like 'f400%'),2,'exact and recent raw events survive');
select ok(exists(select 1 from public.analytics_consent_evidence where id='f6000000-0000-4000-8000-000000000004'),'exact consent-evidence boundary survives');
select ok(exists(select 1 from public.admin_invitations where id='f7000000-0000-4000-8000-000000000006'),'failed invitation at exact cutoff survives');
select ok(exists(select 1 from public.analytics_sessions_v2 where session_id='f3000000-0000-4000-8000-000000000003'), 'retained event protects stale session');
select ok(exists(select 1 from public.analytics_visitors where visitor_id='f2000000-0000-4000-8000-000000000002'), 'active visitor survives despite old acquisition');
select ok(exists(select 1 from public.analytics_visitors where visitor_id='f2000000-0000-4000-8000-000000000004'), 'recent event protects stale visitor');
select is((select first_acquisition from public.analytics_visitors where visitor_id='f2000000-0000-4000-8000-000000000002'),'{}'::jsonb,'old attribution scrubbed independently of active visitor');
select is((select session_acquisition from public.analytics_sessions_v2 where session_id='f3000000-0000-4000-8000-000000000002'),'{}'::jsonb,'old session acquisition scrubbed independently of active session');
select is((select current_attribution from public.analytics_sessions_v2 where session_id='f3000000-0000-4000-8000-000000000002'),'{"source":"qr"}'::jsonb,'recent current attribution survives');
update public.analytics_visitors set first_acquisition='{"source":"new"}'::jsonb where visitor_id='f2000000-0000-4000-8000-000000000002';
select is((select first_acquisition from public.analytics_visitors where visitor_id='f2000000-0000-4000-8000-000000000002'),'{}'::jsonb,'expired first touch cannot be resurrected by later activity');
select is((select count(*)::int from public.analytics_consent_evidence where visitor_id='f2000000-0000-4000-8000-000000000001'),2,'grant and withdrawal preserved together');
select is((select status from public.admin_invitations where id='f7000000-0000-4000-8000-000000000001'),'expired','old pending invitation becomes terminal');
select ok((select expired_at > t from public.admin_invitations,retention_clock where id='f7000000-0000-4000-8000-000000000001'),'terminal timestamp is actual transition, not old validity deadline');
select is((select count(*)::int from retention.purge_runs),1,'actual run records count-only evidence');

create temp table retention_second as select retention.run((select t from retention_clock),100,false) result;
select is((result->'deletedOrScrubbed'->>'raw_events')::int,0,'second run does not re-delete events') from retention_second;
select is((result->'deletedOrScrubbed'->>'empty_sessions')::int,1,'second run removes session emptied by prior event purge') from retention_second;
select is((result->'deletedOrScrubbed'->>'admin_invitations')::int,0,'second run does not re-delete invitations') from retention_second;
select is((result->'deletedOrScrubbed'->>'visitor_acquisition')::int,0,'second run does not re-scrub attribution') from retention_second;
select is((select count(*)::int from retention.purge_runs),2,'second run is separately auditable');

insert into public.analytics_cookieless_events(event_id,project_key,event_name,occurred_at,environment,traffic_class,path)
select e.id,'poza_nuta','page_view',c.t - interval '91 days','production','external','/'
from retention_clock c cross join (values
  ('f5000000-0000-4000-8000-000000000004'::uuid),
  ('f5000000-0000-4000-8000-000000000005'::uuid)
) e(id);
select is((retention.run((select t from retention_clock),1,false)->'deletedOrScrubbed'->>'cookieless_events')::int,1,'batch size one deletes one eligible event');
select is((retention.run((select t from retention_clock),1,false)->'deletedOrScrubbed'->>'cookieless_events')::int,1,'next batch deletes remaining event');
select is((retention.run((select t from retention_clock),1,false)->'deletedOrScrubbed'->>'cookieless_events')::int,0,'drained category is idempotent');

insert into public.analytics_sessions(visit_id,last_seen_at)
select 'f8000000-0000-4000-8000-000000000001',t - interval '15 months' from retention_clock;
select is((retention.run((select t from retention_clock),100,true)->>'legacyGateOpen')::boolean,false,'old legacy row alone cannot open retention clock');
insert into retention.legacy_migration_gate(migration_verified_at,app_paths_clear,reporting_clear,rollback_closed,evidence_reference)
select t - interval '91 days',true,true,true,'local-fixture-verified' from retention_clock;
select is((retention.run((select t from retention_clock),100,true)->'eligible'->>'legacy_sessions')::int,1,'explicit verified milestone opens dry-run eligibility');
select is((retention.run((select t from retention_clock),100,false)->'deletedOrScrubbed'->>'legacy_sessions')::int,1,'legacy row purged only after gate');
insert into public.analytics_sessions(visit_id,last_seen_at)
select 'f8000000-0000-4000-8000-000000000002',t - interval '1 day' from retention_clock;
select throws_ok($$select retention.run((select t from retention_clock),100,false)$$,'55000','legacy_activity_after_verification','new legacy activity invalidates verified milestone');
delete from public.analytics_sessions where visit_id='f8000000-0000-4000-8000-000000000002';

select ok(not exists (select 1 from pg_constraint where conrelid='public.admin_invitations'::regclass and conname='admin_invitations_invited_by_fkey'),'invitation snapshot no longer blocks Auth deletion');
delete from auth.users where id='f1000000-0000-4000-8000-000000000001';
select ok(exists(select 1 from public.admin_invitations where id='f7000000-0000-4000-8000-000000000001' and invited_by='f1000000-0000-4000-8000-000000000001'),'local Auth deletion preserves invitation under its own retention');
insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select 'f1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','retention-invitee@pozanuta.test','',t,'{}','{}',t,t from retention_clock;
insert into public.admin_profiles(user_id,role,status,invited_by)
values ('f1000000-0000-4000-8000-000000000002','viewer','inactive','f1000000-0000-4000-8000-000000000001');
select is((select invited_by from public.admin_profiles where user_id='f1000000-0000-4000-8000-000000000002'),null::uuid,'later profile creation cannot restore a missing inviter FK');

insert into public.analytics_quality_daily(metric_date,environment,metric_name,route,value)
select (t - interval '25 months')::date,'production','drift','unexpected',1 from retention_clock;
select throws_ok($$select retention.run((select t from retention_clock),100,false)$$,'55000','quality_daily_requires_review','aggregate invariant fails closed');
delete from public.analytics_quality_daily where metric_name='drift';
alter table public.analytics_quality_daily add column visitor_id uuid;
select throws_ok($$select retention.run((select t from retention_clock),100,false)$$,'55000','quality_daily_requires_review','identifying aggregate schema drift fails closed');

select * from finish();
rollback;
