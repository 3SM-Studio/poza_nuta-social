begin;
create extension if not exists pgtap with schema extensions;
select plan(58);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('d1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-v2@pozanuta.test','',now(),'{}','{}',now(),now()),
  ('d1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-v2@pozanuta.test','',now(),'{}','{}',now(),now()),
  ('d1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer-v2@pozanuta.test','',now(),'{}','{}',now(),now()),
  ('d1000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','inactive-v2@pozanuta.test','',now(),'{}','{}',now(),now()),
  ('d1000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','nonmember-v2@pozanuta.test','',now(),'{}','{}',now(),now()),
  ('d1000000-0000-4000-8000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','invitee-v2@pozanuta.test','',now(),'{}','{}',now(),now()),
  ('d1000000-0000-4000-8000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','revoked-v2@pozanuta.test','',now(),'{}','{}',now(),now()),
  ('d1000000-0000-4000-8000-000000000008','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pending-v2@pozanuta.test','',now(),'{}','{}',now(),now()),
  ('d1000000-0000-4000-8000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated','expired-v2@pozanuta.test','',now(),'{}','{}',now(),now());

insert into public.admin_profiles (user_id, email, role, status) values
  ('d1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test','owner','active'),
  ('d1000000-0000-4000-8000-000000000002','admin-v2@pozanuta.test','admin','active'),
  ('d1000000-0000-4000-8000-000000000003','viewer-v2@pozanuta.test','viewer','active'),
  ('d1000000-0000-4000-8000-000000000004','inactive-v2@pozanuta.test','admin','inactive');

create function pg_temp.force_invitation_audit_failure()
returns trigger
language plpgsql
as $$
begin
  if new.action = 'admin.invitation.create'
    and new.new_value->>'email' = 'audit-failure-v2@pozanuta.test'
  then
    raise exception 'forced_invitation_audit_failure';
  end if;
  return new;
end;
$$;

create trigger force_invitation_audit_failure
before insert on public.audit_log
for each row execute function pg_temp.force_invitation_audit_failure();

create function pg_temp.demote_last_owner()
returns void
language plpgsql
as $$
begin
  update public.admin_profiles set role = 'admin'
  where user_id = 'd1000000-0000-4000-8000-000000000002';
  set constraints admin_profiles_active_owner_guard immediate;
end;
$$;

create function pg_temp.deactivate_last_owner()
returns void
language plpgsql
as $$
begin
  update public.admin_profiles set status = 'inactive', deactivated_at = now()
  where user_id = 'd1000000-0000-4000-8000-000000000002';
  set constraints admin_profiles_active_owner_guard immediate;
end;
$$;

create function pg_temp.delete_last_owner()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.admin_profiles
  where user_id = 'd1000000-0000-4000-8000-000000000002';
  set constraints admin_profiles_active_owner_guard immediate;
end;
$$;

select is((
  select count(*)::int from pg_proc where oid in (
    'public.admin_bootstrap_owner_v1(uuid,text)'::regprocedure,
    'public.admin_invitation_prepare_v1(uuid,text,text,text)'::regprocedure,
    'public.admin_invitation_begin_delivery_v1(uuid,text,uuid)'::regprocedure,
    'public.admin_invitation_record_delivery_v1(uuid,text,uuid,text,uuid,text)'::regprocedure,
    'public.admin_invitation_revoke_v1(uuid,text,uuid)'::regprocedure,
    'public.admin_invitation_accept_v1(uuid,text)'::regprocedure,
    'public.admin_member_update_v1(uuid,text,uuid,text,text)'::regprocedure,
    'public.admin_transfer_ownership_v1(uuid,text,uuid)'::regprocedure,
    'public.admin_referral_participant_create_v1(uuid,text,text,uuid)'::regprocedure,
    'public.admin_referral_participant_update_v1(uuid,text,uuid,text,text,uuid)'::regprocedure,
    'public.admin_referral_tracking_link_create_v1(uuid,text,uuid,text,text,text)'::regprocedure,
    'public.referral_leaderboard_v1(date,date)'::regprocedure
  ) and not prosecdef
),12,'all Admin V2 RPCs are security invoker');
select ok(not has_function_privilege('anon','public.admin_invitation_prepare_v1(uuid,text,text,text)','execute'),'anon cannot invoke invitation mutations');
select ok(not has_function_privilege('authenticated','public.admin_invitation_prepare_v1(uuid,text,text,text)','execute'),'authenticated users cannot invoke invitation mutations directly');
select ok(has_function_privilege('service_role','public.admin_invitation_prepare_v1(uuid,text,text,text)','execute'),'service role can invoke invitation mutations');
select is((
  select count(*)::int from pg_proc
  where pronamespace = 'public'::regnamespace
    and proname = any(array[
      'admin_bootstrap_owner_v1','admin_invitation_prepare_v1','admin_invitation_begin_delivery_v1',
      'admin_invitation_record_delivery_v1','admin_invitation_revoke_v1','admin_invitation_accept_v1',
      'admin_member_update_v1','admin_transfer_ownership_v1','admin_referral_participant_create_v1',
      'admin_referral_participant_update_v1','admin_referral_tracking_link_create_v1','referral_leaderboard_v1'
    ])
    and (has_function_privilege('anon',oid,'execute') or has_function_privilege('authenticated',oid,'execute'))
),0,'no Admin V2 RPC is executable by anon or authenticated');
select is((
  select count(*)::int from pg_proc
  where pronamespace = 'public'::regnamespace
    and proname = any(array[
      'admin_bootstrap_owner_v1','admin_invitation_prepare_v1','admin_invitation_begin_delivery_v1',
      'admin_invitation_record_delivery_v1','admin_invitation_revoke_v1','admin_invitation_accept_v1',
      'admin_member_update_v1','admin_transfer_ownership_v1','admin_referral_participant_create_v1',
      'admin_referral_participant_update_v1','admin_referral_tracking_link_create_v1','referral_leaderboard_v1'
    ])
    and has_function_privilege('service_role',oid,'execute')
),12,'service role can execute every Admin V2 RPC');
select ok((select relrowsecurity from pg_class where oid='public.admin_invitations'::regclass),'admin invitations have RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.referral_participants'::regclass),'referral participants have RLS enabled');
select ok(not has_table_privilege('anon','public.admin_invitations','select'),'anon has no invitation table access');
select ok(not has_table_privilege('authenticated','public.admin_invitations','select'),'authenticated has no invitation table access');

set local role service_role;

select ok((public.admin_invitation_prepare_v1(
  'd1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test',
  'Pending-V2@PozaNuta.Test','admin'
)->>'created')::boolean,'owner creates a normalized pending admin invitation');
select is((select count(*)::int from public.audit_log where action='admin.invitation.create' and new_value->>'email'='pending-v2@pozanuta.test'),1,'invitation creation has exactly one audit row');
select ok(not (public.admin_invitation_prepare_v1(
  'd1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test',
  'pending-v2@pozanuta.test','admin'
)->>'created')::boolean,'duplicate pending invitation is idempotent');
select is((select count(*)::int from public.admin_invitations where email='pending-v2@pozanuta.test' and status='pending'),1,'duplicate prepare leaves one pending invitation');
select is((public.admin_invitation_prepare_v1(
  'd1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test',
  'pending-v2@pozanuta.test','viewer'
)->'invitation'->>'role'),'viewer','owner can change the role while an invitation is pending');
select ok((public.admin_invitation_accept_v1(
  'd1000000-0000-4000-8000-000000000008','pending-v2@pozanuta.test'
)->>'accepted')::boolean,'changed pending invitation can be accepted');
select is((select role from public.admin_profiles where user_id='d1000000-0000-4000-8000-000000000008'),'viewer','acceptance uses the current stored invitation role');

select public.admin_invitation_prepare_v1(
  'd1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test',
  'expired-v2@pozanuta.test','viewer'
);
update public.admin_invitations
set created_at = now() - interval '2 days', expires_at = now() - interval '1 day'
where email = 'expired-v2@pozanuta.test';
select throws_ok(
  $$select public.admin_invitation_accept_v1('d1000000-0000-4000-8000-000000000009','expired-v2@pozanuta.test')$$,
  '42501','pending_invitation_required','expired invitation cannot create membership'
);
select throws_ok(
  $$select public.admin_invitation_accept_v1('d1000000-0000-4000-8000-000000000009','invalid-v2@pozanuta.test')$$,
  '42501','pending_invitation_required','unknown invitation cannot create membership'
);

select ok((public.admin_invitation_prepare_v1(
  'd1000000-0000-4000-8000-000000000002','admin-v2@pozanuta.test',
  'admin-viewer-invite-v2@pozanuta.test','viewer'
)->>'created')::boolean,'admin can invite a viewer');
select is((public.admin_invitation_begin_delivery_v1(
  'd1000000-0000-4000-8000-000000000002','admin-v2@pozanuta.test',
  (select id from public.admin_invitations where email='admin-viewer-invite-v2@pozanuta.test')
)->>'attempt_count')::int,1,'delivery attempt is recorded before calling Auth Admin');
select is((public.admin_invitation_record_delivery_v1(
  'd1000000-0000-4000-8000-000000000002','admin-v2@pozanuta.test',
  (select id from public.admin_invitations where email='admin-viewer-invite-v2@pozanuta.test'),
  'failed',null,'smtp_unavailable'
)->>'status'),'failed','failed delivery reaches an explicit repairable state');
select is((select delivery_status from public.admin_invitations where email='admin-viewer-invite-v2@pozanuta.test'),'failed','failed delivery status is persisted separately');
select is((public.admin_invitation_begin_delivery_v1(
  'd1000000-0000-4000-8000-000000000002','admin-v2@pozanuta.test',
  (select id from public.admin_invitations where email='admin-viewer-invite-v2@pozanuta.test')
)->>'attempt_count')::int,2,'failed invitation can begin a retry without creating a duplicate');
select is((public.admin_invitation_record_delivery_v1(
  'd1000000-0000-4000-8000-000000000002','admin-v2@pozanuta.test',
  (select id from public.admin_invitations where email='admin-viewer-invite-v2@pozanuta.test'),
  'sent',null,null
)->>'delivery_status'),'sent','retry can return the invitation to a sent pending state');
select is((select count(*)::int from public.audit_log where entity_id=(select id::text from public.admin_invitations where email='admin-viewer-invite-v2@pozanuta.test') and action in ('admin.invitation.delivery_failed','admin.invitation.delivery_sent')),2,'delivery outcomes each have exactly one audit row');
select throws_ok(
  $$select public.admin_invitation_prepare_v1('d1000000-0000-4000-8000-000000000002','admin-v2@pozanuta.test','admin-admin-invite-v2@pozanuta.test','admin')$$,
  '42501','invitation_role_forbidden','admin cannot invite another admin'
);
select throws_ok(
  $$select public.admin_invitation_prepare_v1('d1000000-0000-4000-8000-000000000003','viewer-v2@pozanuta.test','viewer-denied-v2@pozanuta.test','viewer')$$,
  '42501','admin_role_required','viewer cannot create invitations'
);
select throws_ok(
  $$select public.admin_invitation_prepare_v1('d1000000-0000-4000-8000-000000000004','inactive-v2@pozanuta.test','inactive-denied-v2@pozanuta.test','viewer')$$,
  '42501','admin_role_required','inactive member cannot create invitations'
);
select throws_ok(
  $$select public.admin_invitation_prepare_v1('d1000000-0000-4000-8000-000000000005','nonmember-v2@pozanuta.test','nonmember-denied-v2@pozanuta.test','viewer')$$,
  '42501','admin_role_required','nonmember cannot create invitations'
);
select throws_ok(
  $$select public.admin_invitation_prepare_v1('d1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test','viewer-v2@pozanuta.test','viewer')$$,
  '23505','member_already_active','active member cannot receive a duplicate invitation'
);
select throws_ok(
  $$select public.admin_invitation_prepare_v1('d1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test','owner-role-v2@pozanuta.test','owner')$$,
  '42501','invitation_role_forbidden','owner role cannot be granted through an invitation'
);

select public.admin_invitation_prepare_v1(
  'd1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test',
  'revoked-v2@pozanuta.test','viewer'
);
select is((public.admin_invitation_revoke_v1(
  'd1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test',
  (select id from public.admin_invitations where email='revoked-v2@pozanuta.test')
)->>'status'),'revoked','pending invitation can be revoked');
select throws_ok(
  $$select public.admin_invitation_accept_v1('d1000000-0000-4000-8000-000000000007','revoked-v2@pozanuta.test')$$,
  '42501','pending_invitation_required','revoked invitation cannot be accepted'
);
select throws_ok(
  $$select public.admin_invitation_revoke_v1('d1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test',(select id from public.admin_invitations where email='revoked-v2@pozanuta.test'))$$,
  '22023','invitation_not_revocable','revoked invitation cannot transition twice'
);

select public.admin_invitation_prepare_v1(
  'd1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test',
  'invitee-v2@pozanuta.test','viewer'
);
select ok((public.admin_invitation_accept_v1(
  'd1000000-0000-4000-8000-000000000006','INVITEE-V2@POZANUTA.TEST'
)->>'accepted')::boolean,'valid pending invitation is accepted');
select is((select role from public.admin_profiles where user_id='d1000000-0000-4000-8000-000000000006'),'viewer','accepted invitation creates the requested membership role');
select is((select status from public.admin_invitations where email='invitee-v2@pozanuta.test'),'accepted','accepted invitation reaches the accepted state');
select is((select count(*)::int from public.audit_log where action='admin.invitation.accept' and entity_id='d1000000-0000-4000-8000-000000000006'),1,'invitation acceptance has exactly one audit row');
select ok((public.admin_invitation_accept_v1(
  'd1000000-0000-4000-8000-000000000006','invitee-v2@pozanuta.test'
)->>'alreadyMember')::boolean,'repeated acceptance recognizes the active member without another transition');
select is((select count(*)::int from public.audit_log where action='admin.invitation.accept' and entity_id='d1000000-0000-4000-8000-000000000006'),1,'repeated acceptance adds no fake audit row');

select is((public.admin_member_update_v1(
  'd1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test',
  'd1000000-0000-4000-8000-000000000002','viewer','active'
)->>'role'),'viewer','owner can change a non-owner member role');
select is((select count(*)::int from public.audit_log where action='admin.member.role_change' and entity_id='d1000000-0000-4000-8000-000000000002'),1,'member role change has exactly one audit row');
select throws_ok(
  $$select public.admin_member_update_v1('d1000000-0000-4000-8000-000000000003','viewer-v2@pozanuta.test','d1000000-0000-4000-8000-000000000006','viewer','inactive')$$,
  '42501','admin_role_required','viewer cannot mutate memberships'
);
select throws_ok(
  $$select public.admin_member_update_v1('d1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test','d1000000-0000-4000-8000-000000000001','admin','active')$$,
  '42501','owner_requires_transfer','owner cannot demote ownership through ordinary member update'
);

select lives_ok(
  $$select public.admin_transfer_ownership_v1('d1000000-0000-4000-8000-000000000001','owner-v2@pozanuta.test','d1000000-0000-4000-8000-000000000002')$$,
  'ownership transfers atomically to an active member'
);
select is((select role from public.admin_profiles where user_id='d1000000-0000-4000-8000-000000000002'),'owner','transfer promotes the target to owner');
select is((select role from public.admin_profiles where user_id='d1000000-0000-4000-8000-000000000001'),'admin','transfer demotes the previous owner to admin');
select is((select count(*)::int from public.audit_log where action='admin.ownership.transfer' and entity_id='d1000000-0000-4000-8000-000000000002'),1,'ownership transfer has exactly one audit row');
select is((select count(*)::int from public.admin_profiles where role='owner' and status='active'),1,'successful transfer never leaves zero active owners');

select throws_ok($$select pg_temp.demote_last_owner()$$,'23514','active_owner_required','database guard rejects direct last-owner demotion');
select throws_ok($$select pg_temp.deactivate_last_owner()$$,'23514','active_owner_required','database guard rejects direct last-owner deactivation');
select throws_ok($$select pg_temp.delete_last_owner()$$,'23514','active_owner_required','database guard rejects direct last-owner removal');
select throws_ok(
  $$select public.admin_transfer_ownership_v1('d1000000-0000-4000-8000-000000000002','admin-v2@pozanuta.test','d1000000-0000-4000-8000-000000000004')$$,
  '22023','ownership_target_must_be_active','ownership cannot transfer to an inactive member'
);
select is((select count(*)::int from public.admin_profiles where role='owner' and status='active'),1,'failed transfer preserves an active owner');

select throws_ok(
  $$select public.admin_invitation_prepare_v1('d1000000-0000-4000-8000-000000000002','admin-v2@pozanuta.test','audit-failure-v2@pozanuta.test','viewer')$$,
  'P0001','forced_invitation_audit_failure','forced audit failure aborts invitation creation'
);
select is((select count(*)::int from public.admin_invitations where email='audit-failure-v2@pozanuta.test'),0,'forced audit failure rolls back the invitation row');
select is((select count(*)::int from public.audit_log where new_value->>'email' in ('viewer-denied-v2@pozanuta.test','inactive-denied-v2@pozanuta.test','nonmember-denied-v2@pozanuta.test')),0,'rejected invitation mutations create no audit rows');

select * from finish();
rollback;
