begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create function pg_temp.ingest(
  p_event uuid, p_name text, p_session uuid, p_visitor uuid, p_observed jsonb, p_attributed jsonb,
  p_destination text default null
) returns jsonb language sql as $$
  select public.analytics_ingest_event_v1(
    p_event,p_name,p_session,p_visitor,'production','external',p_visitor is not null,false,
    case when p_name='tracking_entry' then '/r/ATTR2' when p_name='outbound_click' then '/go/instagram' else '/' end,
    p_observed,p_attributed,'{}',null,null,p_destination,'mobile','safari','ios','{}'
  )
$$;

set local role service_role;

-- A/B/I: owned poster/copy taxonomy, two outbound choices, resume, and direct inheritance.
select pg_temp.ingest('b1000000-0000-4000-8000-000000000001','tracking_entry','b2000000-0000-4000-8000-000000000001',null,
  '{"channelGroup":"offline","source":"poster","medium":"qr"}','{"channelGroup":"offline","source":"poster","medium":"qr"}');
select pg_temp.ingest('b1000000-0000-4000-8000-000000000002','outbound_click','b2000000-0000-4000-8000-000000000001',null,
  '{"channelGroup":"direct","source":"direct","medium":null}','{"channelGroup":"direct","source":"direct","medium":null}','instagram');
select pg_temp.ingest('b1000000-0000-4000-8000-000000000003','hub_resumed','b2000000-0000-4000-8000-000000000001',null,
  '{"channelGroup":"direct","source":"direct","medium":null}','{"channelGroup":"direct","source":"direct","medium":null}');
select pg_temp.ingest('b1000000-0000-4000-8000-000000000004','outbound_click','b2000000-0000-4000-8000-000000000001',null,
  '{"channelGroup":"direct","source":"direct","medium":null}','{"channelGroup":"direct","source":"direct","medium":null}','tiktok');

select is((select session_acquisition->>'source' from public.analytics_sessions_v2 where session_id='b2000000-0000-4000-8000-000000000001'),'poster','poster is immutable session acquisition');
select is((select attributed_context->>'source' from public.analytics_events_v2 where event_id='b1000000-0000-4000-8000-000000000002'),'poster','direct outbound inherits poster attribution');
select is((select observed_context->>'source' from public.analytics_events_v2 where event_id='b1000000-0000-4000-8000-000000000002'),'direct','outbound observed context remains direct');
select is((select array_agg(session_sequence order by session_sequence) from public.analytics_events_v2 where session_id='b2000000-0000-4000-8000-000000000001'),array[1,2,3,4],'poster return journey sequence is ordered');

-- C/D: poster first visitor, later direct, then ChatGPT.
select pg_temp.ingest('b1000000-0000-4000-8000-000000000011','page_view','b2000000-0000-4000-8000-000000000011','b3000000-0000-4000-8000-000000000001',
  '{"channelGroup":"offline","source":"poster","medium":"qr"}','{"channelGroup":"offline","source":"poster","medium":"qr"}');
select pg_temp.ingest('b1000000-0000-4000-8000-000000000012','page_view','b2000000-0000-4000-8000-000000000012','b3000000-0000-4000-8000-000000000001',
  '{"channelGroup":"direct","source":"direct","medium":null}','{"channelGroup":"direct","source":"direct","medium":null}');
select pg_temp.ingest('b1000000-0000-4000-8000-000000000013','page_view','b2000000-0000-4000-8000-000000000013','b3000000-0000-4000-8000-000000000001',
  '{"channelGroup":"ai_referral","source":"chatgpt","medium":"referral"}','{"channelGroup":"ai_referral","source":"chatgpt","medium":"referral"}');
select is((select first_acquisition->>'source' from public.analytics_visitors where visitor_id='b3000000-0000-4000-8000-000000000001'),'poster','poster remains visitor first acquisition');
select is((select session_acquisition->>'source' from public.analytics_sessions_v2 where session_id='b2000000-0000-4000-8000-000000000012'),'direct','later direct session remains direct');
select is((select session_acquisition->>'source' from public.analytics_sessions_v2 where session_id='b2000000-0000-4000-8000-000000000013'),'chatgpt','later ChatGPT session is attributed independently');

-- E: ChatGPT first then direct.
select pg_temp.ingest('b1000000-0000-4000-8000-000000000021','page_view','b2000000-0000-4000-8000-000000000021','b3000000-0000-4000-8000-000000000002',
  '{"channelGroup":"ai_referral","source":"chatgpt","medium":"referral"}','{"channelGroup":"ai_referral","source":"chatgpt","medium":"referral"}');
select pg_temp.ingest('b1000000-0000-4000-8000-000000000022','page_view','b2000000-0000-4000-8000-000000000022','b3000000-0000-4000-8000-000000000002',
  '{"channelGroup":"direct","source":"direct","medium":null}','{"channelGroup":"direct","source":"direct","medium":null}');
select is((select first_acquisition->>'source' from public.analytics_visitors where visitor_id='b3000000-0000-4000-8000-000000000002'),'chatgpt','ChatGPT remains visitor first acquisition after direct return');
select is((select session_acquisition->>'source' from public.analytics_sessions_v2 where session_id='b2000000-0000-4000-8000-000000000022'),'direct','direct return has direct session acquisition');

-- F: Google first, later Instagram referral.
select pg_temp.ingest('b1000000-0000-4000-8000-000000000031','page_view','b2000000-0000-4000-8000-000000000031','b3000000-0000-4000-8000-000000000003',
  '{"channelGroup":"organic_search","source":"google","medium":"organic"}','{"channelGroup":"organic_search","source":"google","medium":"organic"}');
select pg_temp.ingest('b1000000-0000-4000-8000-000000000032','page_view','b2000000-0000-4000-8000-000000000032','b3000000-0000-4000-8000-000000000003',
  '{"channelGroup":"organic_social","source":"instagram","medium":"social"}','{"channelGroup":"organic_social","source":"instagram","medium":"social"}');
select is((select first_acquisition->>'source' from public.analytics_visitors where visitor_id='b3000000-0000-4000-8000-000000000003'),'google','Google remains visitor first acquisition');
select is((select session_acquisition->>'source' from public.analytics_sessions_v2 where session_id='b2000000-0000-4000-8000-000000000032'),'instagram','Instagram is later session acquisition');

-- G/H: unknown referral and complete UTM-shaped context.
select pg_temp.ingest('b1000000-0000-4000-8000-000000000041','page_view','b2000000-0000-4000-8000-000000000041',null,
  '{"channelGroup":"referral","source":"unknown.example","medium":"referral","referrerHost":"unknown.example"}',
  '{"channelGroup":"referral","source":"unknown.example","medium":"referral","referrerHost":"unknown.example"}');
select pg_temp.ingest('b1000000-0000-4000-8000-000000000042','page_view','b2000000-0000-4000-8000-000000000042',null,
  '{"channelGroup":"email","source":"newsletter","medium":"email","campaign":"launch","content":"hero"}',
  '{"channelGroup":"email","source":"newsletter","medium":"email","campaign":"launch","content":"hero"}');
select is((select attributed_context->>'source' from public.analytics_events_v2 where event_id='b1000000-0000-4000-8000-000000000041'),'unknown.example','unknown referral is retained without guessing');
select is((select attributed_context->>'campaign' from public.analytics_events_v2 where event_id='b1000000-0000-4000-8000-000000000042'),'launch','UTM campaign is preserved');
select is((select attributed_context->>'content' from public.analytics_events_v2 where event_id='b1000000-0000-4000-8000-000000000042'),'hero','UTM content is preserved');
select is((select count(*)::int from public.analytics_events_v2 where event_id::text like 'b1000000-%'),13,'all matrix events are stored once');
select is((select count(*)::int from public.analytics_sessions_v2 where session_id::text like 'b2000000-%'),10,'matrix sessions stay distinct');
select is((select count(*)::int from public.analytics_visitors where visitor_id::text like 'b3000000-%'),3,'only consented matrix visitors are linked');
select is((select count(*)::int from public.analytics_events_v2 where schema_version=1 and event_id::text like 'b1000000-%'),13,'all matrix events use schema v1');

select * from finish();
rollback;
