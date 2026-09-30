begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

-- Simulate the legacy quality counter becoming unavailable to the ingest role.
revoke all on public.analytics_quality_daily from service_role;
set local role service_role;

select is((public.analytics_ingest_event_v1(
  'd4000000-0000-4000-8000-000000000001','page_view','d5000000-0000-4000-8000-000000000001',null,
  'development','external',true,false,'/', '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,
  null,null,null,'desktop','chrome','windows','{}'::jsonb
)->>'duplicate')::boolean, false, 'primary event persists when legacy quality counter cannot write');
select is((select count(*)::int from public.analytics_events_v2 where event_id='d4000000-0000-4000-8000-000000000001'), 1, 'event row remains the source of truth');
select is((public.analytics_ingest_event_v1(
  'd4000000-0000-4000-8000-000000000001','page_view','d5000000-0000-4000-8000-000000000001',null,
  'development','external',true,false,'/', '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,
  null,null,null,'desktop','chrome','windows','{}'::jsonb
)->>'duplicate')::boolean, true, 'retry remains recognizable without quality counter access');

select * from finish();
rollback;
