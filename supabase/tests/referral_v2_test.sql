begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('c1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ref-owner-v2@pozanuta.test','',now(),'{}','{}',now(),now()),
  ('c1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ref-admin-v2@pozanuta.test','',now(),'{}','{}',now(),now()),
  ('c1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ref-viewer-v2@pozanuta.test','',now(),'{}','{}',now(),now());

insert into public.admin_profiles (user_id, email, role, status) values
  ('c1000000-0000-4000-8000-000000000001','ref-owner-v2@pozanuta.test','owner','active'),
  ('c1000000-0000-4000-8000-000000000002','ref-admin-v2@pozanuta.test','admin','active'),
  ('c1000000-0000-4000-8000-000000000003','ref-viewer-v2@pozanuta.test','viewer','active');

create function pg_temp.referral_context(p_participant_id uuid, p_tracking_link_id uuid)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'channelGroup','referral',
    'source','team',
    'medium','referral',
    'trackingLinkId',p_tracking_link_id,
    'referralParticipantId',p_participant_id
  )
$$;

create function pg_temp.ingest_referral(
  p_event_id uuid,
  p_event_name text,
  p_session_id uuid,
  p_visitor_id uuid,
  p_participant_id uuid,
  p_participant_label text,
  p_tracking_link_id uuid,
  p_traffic_class text default 'external',
  p_destination_slug text default null,
  p_environment text default 'production'
)
returns jsonb
language sql
as $$
  select public.analytics_ingest_event_v1(
    p_event_id,
    p_event_name,
    p_session_id,
    p_visitor_id,
    p_environment,
    p_traffic_class,
    p_visitor_id is not null,
    false,
    case
      when p_event_name = 'tracking_entry' then '/r/referral'
      when p_event_name = 'outbound_click' then '/go/' || coalesce(p_destination_slug,'instagram')
      else '/'
    end,
    pg_temp.referral_context(p_participant_id,p_tracking_link_id),
    pg_temp.referral_context(p_participant_id,p_tracking_link_id),
    jsonb_build_object(
      'referralParticipantLabel',p_participant_label,
      'trackingLinkLabel','Referral link'
    ),
    p_tracking_link_id,
    null,
    p_destination_slug,
    'mobile',
    'safari',
    'ios',
    '{}'::jsonb
  )
$$;

create function pg_temp.leaderboard_row(p_participant_id uuid)
returns jsonb
language sql
stable
as $$
  select row_value
  from jsonb_array_elements(public.referral_leaderboard_v1(current_date,current_date + 1)) row_value
  where row_value->>'participantId' = p_participant_id::text
$$;

select ok(not has_function_privilege('anon','public.admin_referral_participant_create_v1(uuid,text,text,uuid)','execute'),'anon cannot invoke referral participant mutations');
select ok(not has_function_privilege('authenticated','public.admin_referral_participant_create_v1(uuid,text,text,uuid)','execute'),'authenticated cannot invoke referral participant mutations directly');
select ok(has_function_privilege('service_role','public.referral_leaderboard_v1(date,date)','execute'),'service role can read the referral leaderboard');
select ok(not has_table_privilege('anon','public.referral_participants','select'),'anon has no referral participant table access');
select ok(not has_table_privilege('authenticated','public.referral_participants','select'),'authenticated has no referral participant table access');

set local role service_role;

select lives_ok(
  $$select public.admin_referral_participant_create_v1('c1000000-0000-4000-8000-000000000001','ref-owner-v2@pozanuta.test','Ala Referral',null)$$,
  'owner creates an unlinked referral participant'
);
select lives_ok(
  $$select public.admin_referral_participant_create_v1('c1000000-0000-4000-8000-000000000002','ref-admin-v2@pozanuta.test','Bartek Referral','c1000000-0000-4000-8000-000000000003')$$,
  'admin creates a referral participant linked to an Auth user'
);
select is((select linked_user_id from public.referral_participants where display_name='Ala Referral'),null::uuid,'referral participant may remain unlinked');
select is((select linked_user_id from public.referral_participants where display_name='Bartek Referral'),'c1000000-0000-4000-8000-000000000003'::uuid,'referral participant may link to an Auth user');
select is((select role from public.admin_profiles where user_id='c1000000-0000-4000-8000-000000000003'),'viewer','referral association does not change admin membership');
select is((select count(*)::int from public.audit_log where action='referral.participant.create' and entity_id in (select id::text from public.referral_participants where display_name in ('Ala Referral','Bartek Referral'))),2,'participant creation writes one audit row per success');
select throws_ok(
  $$select public.admin_referral_participant_create_v1('c1000000-0000-4000-8000-000000000003','ref-viewer-v2@pozanuta.test','Viewer denied',null)$$,
  '42501','admin_role_required','viewer cannot create referral participants'
);

select lives_ok(
  $$select public.admin_referral_tracking_link_create_v1(
    'c1000000-0000-4000-8000-000000000001','ref-owner-v2@pozanuta.test',
    (select id from public.referral_participants where display_name='Ala Referral'),
    'RFAA22','Ala link one','/'
  )$$,
  'owner creates the first referral tracking link'
);
select lives_ok(
  $$select public.admin_referral_tracking_link_create_v1(
    'c1000000-0000-4000-8000-000000000002','ref-admin-v2@pozanuta.test',
    (select id from public.referral_participants where display_name='Ala Referral'),
    'RFAB22','Ala link two','/kontakt'
  )$$,
  'admin creates another tracking link for the same participant'
);
select lives_ok(
  $$select public.admin_referral_tracking_link_create_v1(
    'c1000000-0000-4000-8000-000000000002','ref-admin-v2@pozanuta.test',
    (select id from public.referral_participants where display_name='Bartek Referral'),
    'RFBB22','Bartek link one','/'
  )$$,
  'admin creates a tracking link for the linked participant'
);
select is((select count(*)::int from public.tracking_links where referral_participant_id=(select id from public.referral_participants where display_name='Ala Referral')),2,'one participant can own many referral tracking links');
select results_eq(
  $$select channel_group, source, medium from public.tracking_links where code='RFAA22'$$,
  $$values ('referral'::text,'team'::text,'referral'::text)$$,
  'referral link uses the fixed referral/team/referral taxonomy'
);
select throws_ok(
  $$insert into public.tracking_links (code,label,channel_group,source,medium,landing_path,active,referral_participant_id)
    values ('BADRV2','Bad taxonomy','offline','poster','qr','/',true,(select id from public.referral_participants where display_name='Ala Referral'))$$,
  '23514',null,'database rejects a participant link with non-referral taxonomy'
);
select is((select count(*)::int from public.audit_log where action='referral.link.create' and new_value->>'code' in ('RFAA22','RFAB22','RFBB22')),3,'referral link creation has exactly one audit row per success');

select pg_temp.ingest_referral(
  'c2000000-0000-4000-8000-000000000001','tracking_entry',
  'c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001',
  (select id from public.referral_participants where display_name='Ala Referral'),'Ala Referral',
  (select id from public.tracking_links where code='RFAA22')
);
select pg_temp.ingest_referral(
  'c2000000-0000-4000-8000-000000000002','tracking_entry',
  'c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001',
  (select id from public.referral_participants where display_name='Bartek Referral'),'Bartek Referral',
  (select id from public.tracking_links where code='RFBB22')
);
select pg_temp.ingest_referral(
  'c2000000-0000-4000-8000-000000000003','outbound_click',
  'c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001',
  (select id from public.referral_participants where display_name='Ala Referral'),'Ala Referral',
  (select id from public.tracking_links where code='RFAA22'),'external','instagram'
);
select pg_temp.ingest_referral(
  'c2000000-0000-4000-8000-000000000004','outbound_click',
  'c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001',
  (select id from public.referral_participants where display_name='Ala Referral'),'Ala Referral',
  (select id from public.tracking_links where code='RFAA22'),'external','tiktok'
);
select pg_temp.ingest_referral(
  'c2000000-0000-4000-8000-000000000005','contact_view',
  'c3000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001',
  (select id from public.referral_participants where display_name='Ala Referral'),'Ala Referral',
  (select id from public.tracking_links where code='RFAA22')
);

select is(
  (select session_acquisition->>'referralParticipantId' from public.analytics_sessions_v2 where session_id='c3000000-0000-4000-8000-000000000001'),
  (select id::text from public.referral_participants where display_name='Ala Referral'),
  'later referral touch does not rewrite the established session participant'
);

select pg_temp.ingest_referral(
  'c2000000-0000-4000-8000-000000000006','tracking_entry',
  'c3000000-0000-4000-8000-000000000002','c4000000-0000-4000-8000-000000000001',
  (select id from public.referral_participants where display_name='Bartek Referral'),'Bartek Referral',
  (select id from public.tracking_links where code='RFBB22')
);
select pg_temp.ingest_referral(
  'c2000000-0000-4000-8000-000000000007','outbound_click',
  'c3000000-0000-4000-8000-000000000002','c4000000-0000-4000-8000-000000000001',
  (select id from public.referral_participants where display_name='Bartek Referral'),'Bartek Referral',
  (select id from public.tracking_links where code='RFBB22'),'external','instagram'
);
select is(
  (select session_acquisition->>'referralParticipantId' from public.analytics_sessions_v2 where session_id='c3000000-0000-4000-8000-000000000002'),
  (select id::text from public.referral_participants where display_name='Bartek Referral'),
  'a later new session may be acquired by a different participant'
);
select is(
  (select first_acquisition->>'referralParticipantId' from public.analytics_visitors where visitor_id='c4000000-0000-4000-8000-000000000001'),
  (select id::text from public.referral_participants where display_name='Ala Referral'),
  'visitor first acquisition remains immutable across later sessions'
);

select pg_temp.ingest_referral(
  'c2000000-0000-4000-8000-000000000008','tracking_entry',
  'c3000000-0000-4000-8000-000000000003','c4000000-0000-4000-8000-000000000002',
  (select id from public.referral_participants where display_name='Ala Referral'),'Ala Referral',
  (select id from public.tracking_links where code='RFAB22'),'internal'
);
select pg_temp.ingest_referral(
  'c2000000-0000-4000-8000-000000000009','tracking_entry',
  'c3000000-0000-4000-8000-000000000004','c4000000-0000-4000-8000-000000000003',
  (select id from public.referral_participants where display_name='Ala Referral'),'Ala Referral',
  (select id from public.tracking_links where code='RFAB22'),'bot'
);
select pg_temp.ingest_referral(
  'c2000000-0000-4000-8000-000000000010','tracking_entry',
  'c3000000-0000-4000-8000-000000000005',null,
  (select id from public.referral_participants where display_name='Ala Referral'),'Ala Referral',
  (select id from public.tracking_links where code='RFAB22')
);
select pg_temp.ingest_referral(
  'c2000000-0000-4000-8000-000000000011','tracking_entry',
  'c3000000-0000-4000-8000-000000000006',null,
  (select id from public.referral_participants where display_name='Ala Referral'),'Ala Referral',
  (select id from public.tracking_links where code='RFAB22'),'test'
);
select pg_temp.ingest_referral(
  'c2000000-0000-4000-8000-000000000012','tracking_entry',
  'c3000000-0000-4000-8000-000000000007',null,
  (select id from public.referral_participants where display_name='Ala Referral'),'Ala Referral',
  (select id from public.tracking_links where code='RFAB22'),'external',null,'preview'
);

select is((pg_temp.leaderboard_row((select id from public.referral_participants where display_name='Ala Referral'))->>'newVisitors')::int,1,'leaderboard counts one consented new pseudonymous visitor for Ala');
select is((pg_temp.leaderboard_row((select id from public.referral_participants where display_name='Ala Referral'))->>'acquiredSessions')::int,2,'leaderboard excludes internal, bot, test and preview sessions while retaining anonymous acquisition');
select is((pg_temp.leaderboard_row((select id from public.referral_participants where display_name='Ala Referral'))->>'outboundSessions')::int,1,'leaderboard counts outbound sessions once');
select is((pg_temp.leaderboard_row((select id from public.referral_participants where display_name='Ala Referral'))->>'outboundClicks')::int,2,'leaderboard counts all eligible outbound clicks');
select is((pg_temp.leaderboard_row((select id from public.referral_participants where display_name='Ala Referral'))->>'multiDestinationSessions')::int,1,'leaderboard counts multi-destination sessions');
select is((pg_temp.leaderboard_row((select id from public.referral_participants where display_name='Ala Referral'))->>'contactInterestSessions')::int,1,'leaderboard counts contact-interest sessions');
select is((pg_temp.leaderboard_row((select id from public.referral_participants where display_name='Bartek Referral'))->>'newVisitors')::int,0,'later-session participant receives no false new visitor');
select is((pg_temp.leaderboard_row((select id from public.referral_participants where display_name='Bartek Referral'))->>'acquiredSessions')::int,1,'later-session participant receives its acquired session');

select is((public.admin_referral_participant_update_v1(
  'c1000000-0000-4000-8000-000000000001','ref-owner-v2@pozanuta.test',
  (select id from public.referral_participants where display_name='Ala Referral'),
  'Ala Renamed','inactive',null
)->>'status'),'inactive','participant can be renamed and deactivated');
select is((pg_temp.leaderboard_row((select id from public.referral_participants where display_name='Ala Renamed'))->>'participant'),'Ala Referral','historical leaderboard label comes from the acquisition snapshot after rename');
select is((pg_temp.leaderboard_row((select id from public.referral_participants where display_name='Ala Renamed'))->>'status'),'inactive','leaderboard exposes the participant current status separately from historical label');
select throws_ok(
  $$select public.admin_referral_tracking_link_create_v1(
    'c1000000-0000-4000-8000-000000000001','ref-owner-v2@pozanuta.test',
    (select id from public.referral_participants where display_name='Ala Renamed'),
    'RFAC22','Inactive link','/'
  )$$,
  '22023','active_participant_required','inactive participant cannot receive a new referral link'
);

select * from finish();
rollback;
