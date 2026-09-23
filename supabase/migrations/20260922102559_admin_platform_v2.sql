-- Admin Platform V2: database-backed membership, repairable invitations,
-- owner safety, separate referral participants, and referral acquisition metrics.

alter table public.admin_profiles
  add column if not exists email text,
  add column if not exists status text not null default 'active',
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists deactivated_at timestamptz;

update public.admin_profiles p
set email = lower(u.email)
from auth.users u
where p.user_id = u.id and p.email is null and u.email is not null;

alter table public.admin_profiles
  add constraint admin_profiles_status_allowed check (status in ('active','inactive')) not valid,
  add constraint admin_profiles_email_normalized check (email is null or email = lower(btrim(email))) not valid;
alter table public.admin_profiles validate constraint admin_profiles_status_allowed;
alter table public.admin_profiles validate constraint admin_profiles_email_normalized;

create unique index admin_profiles_email_unique_idx
  on public.admin_profiles (lower(email)) where email is not null;
create index admin_profiles_status_role_idx on public.admin_profiles (status, role);
create index admin_profiles_invited_by_idx on public.admin_profiles (invited_by) where invited_by is not null;

create table public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('admin','viewer')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired','failed')),
  delivery_status text not null default 'not_attempted' check (delivery_status in ('not_attempted','sent','existing_user','failed')),
  auth_user_id uuid references auth.users(id) on delete set null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  failure_code text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  check (failure_code is null or octet_length(failure_code) <= 160),
  check (expires_at > created_at)
);

create unique index admin_invitations_pending_email_idx
  on public.admin_invitations (lower(email)) where status = 'pending';
create index admin_invitations_status_created_idx on public.admin_invitations (status, created_at desc);
create index admin_invitations_invited_by_idx on public.admin_invitations (invited_by, created_at desc);
create index admin_invitations_auth_user_idx on public.admin_invitations (auth_user_id) where auth_user_id is not null;

drop trigger if exists admin_invitations_touch_updated_at on public.admin_invitations;
create trigger admin_invitations_touch_updated_at before update on public.admin_invitations
for each row execute function public.touch_updated_at();

create table public.referral_participants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  linked_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(display_name)) between 1 and 120)
);

create unique index referral_participants_linked_user_idx
  on public.referral_participants (linked_user_id) where linked_user_id is not null;
create index referral_participants_status_created_idx on public.referral_participants (status, created_at desc);

drop trigger if exists referral_participants_touch_updated_at on public.referral_participants;
create trigger referral_participants_touch_updated_at before update on public.referral_participants
for each row execute function public.touch_updated_at();

alter table public.tracking_links
  add column if not exists referral_participant_id uuid references public.referral_participants(id) on delete restrict;
create index tracking_links_referral_participant_idx
  on public.tracking_links (referral_participant_id, created_at desc)
  where referral_participant_id is not null;

alter table public.tracking_links
  add constraint tracking_links_referral_taxonomy check (
    (referral_participant_id is null and not (channel_group = 'referral' and source = 'team' and medium = 'referral'))
    or
    (referral_participant_id is not null and channel_group = 'referral' and source = 'team' and medium = 'referral')
  ) not valid;
alter table public.tracking_links validate constraint tracking_links_referral_taxonomy;

alter table public.admin_invitations enable row level security;
alter table public.referral_participants enable row level security;

create or replace function public.assert_admin_role_v2(
  p_actor_user_id uuid,
  p_allowed_roles text[]
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role
  from public.admin_profiles
  where user_id = p_actor_user_id and status = 'active';

  if v_role is null or not (v_role = any(p_allowed_roles)) then
    raise exception 'admin_role_required' using errcode = '42501';
  end if;
  return v_role;
end;
$$;

create or replace function public.assert_admin_editor_v1(p_actor_user_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.admin_profiles
    where user_id = p_actor_user_id
      and status = 'active'
      and role in ('owner','admin')
  ) then
    raise exception 'admin_editor_required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.enforce_active_owner_v2()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('admin_profiles.active_owner', 0));
  if not exists (
    select 1 from public.admin_profiles where role = 'owner' and status = 'active'
  ) then
    raise exception 'active_owner_required' using errcode = '23514';
  end if;
  return null;
end;
$$;

drop trigger if exists admin_profiles_active_owner_guard on public.admin_profiles;
create constraint trigger admin_profiles_active_owner_guard
after insert or update or delete on public.admin_profiles
deferrable initially deferred
for each row execute function public.enforce_active_owner_v2();

create or replace function public.admin_bootstrap_owner_v1(
  p_user_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_email text := lower(btrim(p_email));
  v_row jsonb;
begin
  if p_user_id is null or v_email = '' then
    raise exception 'invalid_bootstrap_identity' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('admin_profiles.active_owner', 0));
  if exists (select 1 from public.admin_profiles where role = 'owner' and status = 'active') then
    raise exception 'bootstrap_closed' using errcode = '42501';
  end if;

  insert into public.admin_profiles as p (user_id, email, role, status, deactivated_at)
  values (p_user_id, v_email, 'owner', 'active', null)
  on conflict (user_id) do update set
    email = excluded.email,
    role = 'owner',
    status = 'active',
    deactivated_at = null
  returning to_jsonb(p) into v_row;

  insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, new_value)
  values (p_user_id, v_email, 'admin.bootstrap_owner', 'admin_profile', p_user_id::text, v_row);
  return v_row;
end;
$$;

create or replace function public.admin_invitation_prepare_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_email text,
  p_role text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor_role text;
  v_email text := lower(btrim(p_email));
  v_existing public.admin_invitations%rowtype;
  v_new public.admin_invitations%rowtype;
begin
  v_actor_role := public.assert_admin_role_v2(p_actor_user_id, array['owner','admin']);
  if p_role not in ('admin','viewer') or (v_actor_role = 'admin' and p_role <> 'viewer') then
    raise exception 'invitation_role_forbidden' using errcode = '42501';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_invitation_email' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('admin_invitation:' || v_email, 0));
  if exists (
    select 1 from public.admin_profiles
    where lower(email) = v_email and status = 'active'
  ) then
    raise exception 'member_already_active' using errcode = '23505';
  end if;

  update public.admin_invitations
  set status = 'expired'
  where lower(email) = v_email and status = 'pending' and expires_at <= now();

  select * into v_existing
  from public.admin_invitations
  where lower(email) = v_email and status = 'pending'
  for update;
  if found then
    if v_existing.role <> p_role and v_actor_role = 'owner' then
      update public.admin_invitations
      set role = p_role
      where id = v_existing.id
      returning * into v_existing;
    end if;
    return jsonb_build_object('created', false, 'invitation', to_jsonb(v_existing));
  end if;

  insert into public.admin_invitations (email, role, invited_by)
  values (v_email, p_role, p_actor_user_id)
  returning * into v_new;

  insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, new_value)
  values (p_actor_user_id, p_actor_email, 'admin.invitation.create', 'admin_invitation', v_new.id::text, to_jsonb(v_new));
  return jsonb_build_object('created', true, 'invitation', to_jsonb(v_new));
end;
$$;

create or replace function public.admin_invitation_begin_delivery_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor_role text;
  v_old jsonb;
  v_new jsonb;
  v_inviter uuid;
  v_role text;
begin
  v_actor_role := public.assert_admin_role_v2(p_actor_user_id, array['owner','admin']);
  select to_jsonb(i), i.invited_by, i.role into v_old, v_inviter, v_role
  from public.admin_invitations i where i.id = p_invitation_id for update;
  if not found then raise exception 'invitation_not_found' using errcode = 'P0002'; end if;
  if v_actor_role = 'admin' and (v_inviter <> p_actor_user_id or v_role <> 'viewer') then
    raise exception 'invitation_forbidden' using errcode = '42501';
  end if;
  if v_old->>'status' not in ('pending','failed') then
    raise exception 'invitation_not_retryable' using errcode = '22023';
  end if;

  update public.admin_invitations i
  set status = 'pending', delivery_status = 'not_attempted', failure_code = null,
      attempt_count = i.attempt_count + 1, last_attempt_at = now()
  where i.id = p_invitation_id
  returning to_jsonb(i) into v_new;
  insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value)
  values (p_actor_user_id, p_actor_email, 'admin.invitation.delivery_begin', 'admin_invitation', p_invitation_id::text, v_old, v_new);
  return v_new;
end;
$$;

create or replace function public.admin_invitation_record_delivery_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_invitation_id uuid,
  p_outcome text,
  p_auth_user_id uuid,
  p_failure_code text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor_role text;
  v_old jsonb;
  v_new jsonb;
  v_inviter uuid;
  v_role text;
begin
  v_actor_role := public.assert_admin_role_v2(p_actor_user_id, array['owner','admin']);
  if p_outcome not in ('sent','existing_user','failed') then
    raise exception 'invalid_delivery_outcome' using errcode = '22023';
  end if;
  select to_jsonb(i), i.invited_by, i.role into v_old, v_inviter, v_role
  from public.admin_invitations i where i.id = p_invitation_id for update;
  if not found then raise exception 'invitation_not_found' using errcode = 'P0002'; end if;
  if v_actor_role = 'admin' and (v_inviter <> p_actor_user_id or v_role <> 'viewer') then
    raise exception 'invitation_forbidden' using errcode = '42501';
  end if;
  if v_old->>'status' <> 'pending' then
    raise exception 'invitation_not_pending' using errcode = '22023';
  end if;

  update public.admin_invitations i
  set status = case when p_outcome = 'failed' then 'failed' else 'pending' end,
      delivery_status = p_outcome,
      auth_user_id = coalesce(p_auth_user_id, i.auth_user_id),
      failure_code = case when p_outcome = 'failed' then left(coalesce(p_failure_code, 'auth_error'), 160) else null end
  where i.id = p_invitation_id
  returning to_jsonb(i) into v_new;

  insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value)
  values (p_actor_user_id, p_actor_email, 'admin.invitation.delivery_' || p_outcome, 'admin_invitation', p_invitation_id::text, v_old, v_new);
  return v_new;
end;
$$;

create or replace function public.admin_invitation_revoke_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor_role text;
  v_old jsonb;
  v_new jsonb;
  v_inviter uuid;
  v_role text;
begin
  v_actor_role := public.assert_admin_role_v2(p_actor_user_id, array['owner','admin']);
  select to_jsonb(i), i.invited_by, i.role into v_old, v_inviter, v_role
  from public.admin_invitations i where i.id = p_invitation_id for update;
  if not found then raise exception 'invitation_not_found' using errcode = 'P0002'; end if;
  if v_actor_role = 'admin' and (v_inviter <> p_actor_user_id or v_role <> 'viewer') then
    raise exception 'invitation_forbidden' using errcode = '42501';
  end if;
  if v_old->>'status' not in ('pending','failed') then
    raise exception 'invitation_not_revocable' using errcode = '22023';
  end if;
  update public.admin_invitations i
  set status = 'revoked', revoked_at = now()
  where i.id = p_invitation_id returning to_jsonb(i) into v_new;
  insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value)
  values (p_actor_user_id, p_actor_email, 'admin.invitation.revoke', 'admin_invitation', p_invitation_id::text, v_old, v_new);
  return v_new;
end;
$$;

create or replace function public.admin_invitation_accept_v1(
  p_user_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_email text := lower(btrim(p_email));
  v_invitation public.admin_invitations%rowtype;
  v_profile public.admin_profiles%rowtype;
begin
  if p_user_id is null or v_email = '' then
    raise exception 'invalid_acceptance_identity' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('admin_invitation:' || v_email, 0));

  select * into v_profile from public.admin_profiles where user_id = p_user_id for update;
  if found and v_profile.status = 'active' then
    return jsonb_build_object('accepted', false, 'alreadyMember', true, 'profile', to_jsonb(v_profile));
  end if;

  update public.admin_invitations
  set status = 'expired'
  where lower(email) = v_email and status = 'pending' and expires_at <= now();

  select * into v_invitation
  from public.admin_invitations
  where lower(email) = v_email and status = 'pending' and expires_at > now()
  order by created_at desc
  limit 1
  for update;
  if not found then raise exception 'pending_invitation_required' using errcode = '42501'; end if;

  insert into public.admin_profiles as p (user_id, email, role, status, invited_by, deactivated_at)
  values (p_user_id, v_email, v_invitation.role, 'active', v_invitation.invited_by, null)
  on conflict (user_id) do update set
    email = excluded.email,
    role = excluded.role,
    status = 'active',
    invited_by = excluded.invited_by,
    deactivated_at = null
  returning * into v_profile;

  update public.admin_invitations
  set status = 'accepted', auth_user_id = p_user_id, accepted_at = now(), failure_code = null
  where id = v_invitation.id;

  insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value)
  values (p_user_id, v_email, 'admin.invitation.accept', 'admin_profile', p_user_id::text,
    to_jsonb(v_invitation), to_jsonb(v_profile));
  return jsonb_build_object('accepted', true, 'alreadyMember', false, 'profile', to_jsonb(v_profile));
end;
$$;

create or replace function public.admin_member_update_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_target_user_id uuid,
  p_role text,
  p_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_action text;
begin
  perform pg_advisory_xact_lock(hashtextextended('admin_profiles.active_owner', 0));
  perform public.assert_admin_role_v2(p_actor_user_id, array['owner']);
  if p_role not in ('admin','viewer') or p_status not in ('active','inactive') then
    raise exception 'invalid_member_update' using errcode = '22023';
  end if;
  select to_jsonb(p) into v_old from public.admin_profiles p
  where p.user_id = p_target_user_id for update;
  if not found then raise exception 'member_not_found' using errcode = 'P0002'; end if;
  if v_old->>'role' = 'owner' then
    raise exception 'owner_requires_transfer' using errcode = '42501';
  end if;
  update public.admin_profiles p
  set role = p_role,
      status = p_status,
      deactivated_at = case when p_status = 'inactive' then coalesce(p.deactivated_at, now()) else null end
  where p.user_id = p_target_user_id
  returning to_jsonb(p) into v_new;
  v_action := case
    when v_old->>'status' <> p_status and p_status = 'inactive' then 'admin.member.deactivate'
    when v_old->>'status' <> p_status and p_status = 'active' then 'admin.member.activate'
    else 'admin.member.role_change'
  end;
  insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value)
  values (p_actor_user_id, p_actor_email, v_action, 'admin_profile', p_target_user_id::text, v_old, v_new);
  return v_new;
end;
$$;

create or replace function public.admin_transfer_ownership_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_target_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  if p_actor_user_id = p_target_user_id then
    raise exception 'ownership_target_must_differ' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('admin_profiles.active_owner', 0));
  perform public.assert_admin_role_v2(p_actor_user_id, array['owner']);
  perform 1 from public.admin_profiles
  where user_id in (p_actor_user_id, p_target_user_id)
  order by user_id for update;
  if not exists (
    select 1 from public.admin_profiles
    where user_id = p_target_user_id and status = 'active'
  ) then
    raise exception 'ownership_target_must_be_active' using errcode = '22023';
  end if;
  select jsonb_agg(to_jsonb(p) order by p.user_id) into v_old
  from public.admin_profiles p where p.user_id in (p_actor_user_id, p_target_user_id);

  update public.admin_profiles
  set role = case when user_id = p_target_user_id then 'owner' else 'admin' end
  where user_id in (p_actor_user_id, p_target_user_id);

  select jsonb_agg(to_jsonb(p) order by p.user_id) into v_new
  from public.admin_profiles p where p.user_id in (p_actor_user_id, p_target_user_id);
  insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value)
  values (p_actor_user_id, p_actor_email, 'admin.ownership.transfer', 'admin_ownership', p_target_user_id::text, v_old, v_new);
  return jsonb_build_object('old', v_old, 'new', v_new);
end;
$$;

create or replace function public.admin_referral_participant_create_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_display_name text,
  p_linked_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.referral_participants%rowtype;
begin
  perform public.assert_admin_role_v2(p_actor_user_id, array['owner','admin']);
  if char_length(btrim(p_display_name)) not between 1 and 120 then
    raise exception 'invalid_participant_name' using errcode = '22023';
  end if;
  insert into public.referral_participants (display_name, linked_user_id)
  values (btrim(p_display_name), p_linked_user_id) returning * into v_row;
  insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, new_value)
  values (p_actor_user_id, p_actor_email, 'referral.participant.create', 'referral_participant', v_row.id::text, to_jsonb(v_row));
  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_referral_participant_update_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_participant_id uuid,
  p_display_name text,
  p_status text,
  p_linked_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  perform public.assert_admin_role_v2(p_actor_user_id, array['owner','admin']);
  if char_length(btrim(p_display_name)) not between 1 and 120 or p_status not in ('active','inactive') then
    raise exception 'invalid_participant_update' using errcode = '22023';
  end if;
  select to_jsonb(p) into v_old from public.referral_participants p
  where p.id = p_participant_id for update;
  if not found then raise exception 'participant_not_found' using errcode = 'P0002'; end if;
  update public.referral_participants p
  set display_name = btrim(p_display_name), status = p_status, linked_user_id = p_linked_user_id
  where p.id = p_participant_id returning to_jsonb(p) into v_new;
  insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value)
  values (p_actor_user_id, p_actor_email, 'referral.participant.update', 'referral_participant', p_participant_id::text, v_old, v_new);
  return v_new;
end;
$$;

create or replace function public.admin_referral_tracking_link_create_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_participant_id uuid,
  p_code text,
  p_label text,
  p_landing_path text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_participant public.referral_participants%rowtype;
  v_link public.tracking_links%rowtype;
begin
  perform public.assert_admin_role_v2(p_actor_user_id, array['owner','admin']);
  select * into v_participant from public.referral_participants
  where id = p_participant_id and status = 'active' for update;
  if not found then raise exception 'active_participant_required' using errcode = '22023'; end if;
  if char_length(btrim(p_label)) not between 1 and 120 or p_landing_path not in ('/','/kontakt') then
    raise exception 'invalid_referral_link' using errcode = '22023';
  end if;
  insert into public.tracking_links (
    code, label, channel_group, source, medium, landing_path, active, referral_participant_id
  ) values (
    p_code, btrim(p_label), 'referral', 'team', 'referral', p_landing_path, true, p_participant_id
  ) returning * into v_link;
  insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, new_value)
  values (p_actor_user_id, p_actor_email, 'referral.link.create', 'tracking_link', v_link.id::text,
    to_jsonb(v_link) || jsonb_build_object('referralParticipantLabel', v_participant.display_name));
  return to_jsonb(v_link);
end;
$$;

create or replace function public.referral_leaderboard_v1(
  p_from_date date,
  p_to_date_exclusive date
)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  with bounds as (
    select (p_from_date::timestamp at time zone 'Europe/Warsaw') from_ts,
           (p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw') to_ts
  ), eligible_events as (
    select e.* from public.analytics_events_v2 e, bounds b
    where e.occurred_at >= b.from_ts and e.occurred_at < b.to_ts
      and e.environment = 'production' and e.traffic_class = 'external'
  ), eligible_sessions as (
    select distinct session_id from eligible_events
  ), acquired as (
    select s.session_id,
      (s.session_acquisition->>'referralParticipantId')::uuid participant_id,
      snap.label
    from public.analytics_sessions_v2 s
    join eligible_sessions es on es.session_id = s.session_id
    left join lateral (
      select nullif(e.dimension_snapshots->>'referralParticipantLabel','') label
      from public.analytics_events_v2 e
      where e.session_id = s.session_id
        and e.attributed_context = s.session_acquisition
      order by e.session_sequence
      limit 1
    ) snap on true
    where nullif(s.session_acquisition->>'referralParticipantId','') is not null
  ), session_metrics as (
    select a.participant_id, a.session_id,
      bool_or(e.event_name = 'outbound_click') outbound,
      count(*) filter (where e.event_name = 'outbound_click') outbound_clicks,
      count(distinct e.destination_slug) filter (where e.event_name = 'outbound_click') destinations,
      bool_or(e.event_name in ('contact_view','contact_click')) contact_interest,
      max(a.label) label
    from acquired a
    join eligible_events e on e.session_id = a.session_id
    group by a.participant_id, a.session_id
  ), session_rollup as (
    select participant_id,
      count(*)::int acquired_sessions,
      count(*) filter (where outbound)::int outbound_sessions,
      coalesce(sum(outbound_clicks),0)::int outbound_clicks,
      count(*) filter (where destinations >= 2)::int multi_destination_sessions,
      count(*) filter (where contact_interest)::int contact_interest_sessions,
      (array_agg(label order by session_id desc) filter (where label is not null))[1] snapshot_label
    from session_metrics group by participant_id
  ), visitor_first as (
    select (v.first_acquisition->>'referralParticipantId')::uuid participant_id,
      count(distinct v.visitor_id)::int new_visitors
    from public.analytics_visitors v, bounds b
    where v.first_seen_at >= b.from_ts and v.first_seen_at < b.to_ts
      and nullif(v.first_acquisition->>'referralParticipantId','') is not null
      and exists (
        select 1
        from public.analytics_events_v2 e
        where e.visitor_id = v.visitor_id
          and e.attributed_context->>'referralParticipantId' = v.first_acquisition->>'referralParticipantId'
          and e.environment = 'production' and e.traffic_class = 'external'
          and e.occurred_at >= b.from_ts and e.occurred_at < b.to_ts
          and not exists (
            select 1 from public.analytics_events_v2 earlier
            where earlier.visitor_id = v.visitor_id
              and (earlier.occurred_at, earlier.id) < (e.occurred_at, e.id)
          )
      )
    group by 1
  ), rows as (
    select p.id participant_id,
      coalesce(sr.snapshot_label, p.display_name) participant,
      p.status,
      coalesce(vf.new_visitors,0) new_visitors,
      coalesce(sr.acquired_sessions,0) acquired_sessions,
      coalesce(sr.outbound_sessions,0) outbound_sessions,
      case when coalesce(sr.acquired_sessions,0) > 0
        then round(sr.outbound_sessions::numeric / sr.acquired_sessions * 100, 2) else 0 end outbound_session_rate,
      coalesce(sr.outbound_clicks,0) outbound_clicks,
      coalesce(sr.multi_destination_sessions,0) multi_destination_sessions,
      coalesce(sr.contact_interest_sessions,0) contact_interest_sessions
    from public.referral_participants p
    left join session_rollup sr on sr.participant_id = p.id
    left join visitor_first vf on vf.participant_id = p.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'participantId', participant_id,
    'participant', participant,
    'status', status,
    'newVisitors', new_visitors,
    'acquiredSessions', acquired_sessions,
    'outboundSessions', outbound_sessions,
    'outboundSessionRate', outbound_session_rate,
    'outboundClicks', outbound_clicks,
    'multiDestinationSessions', multi_destination_sessions,
    'contactInterestSessions', contact_interest_sessions
  ) order by new_visitors desc, acquired_sessions desc, outbound_sessions desc, participant_id), '[]'::jsonb)
  from rows;
$$;

revoke all on table public.admin_invitations, public.referral_participants
from public, anon, authenticated, service_role;
grant select, insert, update on table public.admin_invitations, public.referral_participants to service_role;

revoke all on function public.assert_admin_role_v2(uuid,text[]) from public, anon, authenticated;
revoke all on function public.enforce_active_owner_v2() from public, anon, authenticated;
revoke all on function public.admin_bootstrap_owner_v1(uuid,text) from public, anon, authenticated;
revoke all on function public.admin_invitation_prepare_v1(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.admin_invitation_begin_delivery_v1(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.admin_invitation_record_delivery_v1(uuid,text,uuid,text,uuid,text) from public, anon, authenticated;
revoke all on function public.admin_invitation_revoke_v1(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.admin_invitation_accept_v1(uuid,text) from public, anon, authenticated;
revoke all on function public.admin_member_update_v1(uuid,text,uuid,text,text) from public, anon, authenticated;
revoke all on function public.admin_transfer_ownership_v1(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.admin_referral_participant_create_v1(uuid,text,text,uuid) from public, anon, authenticated;
revoke all on function public.admin_referral_participant_update_v1(uuid,text,uuid,text,text,uuid) from public, anon, authenticated;
revoke all on function public.admin_referral_tracking_link_create_v1(uuid,text,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.referral_leaderboard_v1(date,date) from public, anon, authenticated;

grant execute on function public.assert_admin_role_v2(uuid,text[]) to service_role;
grant execute on function public.admin_bootstrap_owner_v1(uuid,text) to service_role;
grant execute on function public.admin_invitation_prepare_v1(uuid,text,text,text) to service_role;
grant execute on function public.admin_invitation_begin_delivery_v1(uuid,text,uuid) to service_role;
grant execute on function public.admin_invitation_record_delivery_v1(uuid,text,uuid,text,uuid,text) to service_role;
grant execute on function public.admin_invitation_revoke_v1(uuid,text,uuid) to service_role;
grant execute on function public.admin_invitation_accept_v1(uuid,text) to service_role;
grant execute on function public.admin_member_update_v1(uuid,text,uuid,text,text) to service_role;
grant execute on function public.admin_transfer_ownership_v1(uuid,text,uuid) to service_role;
grant execute on function public.admin_referral_participant_create_v1(uuid,text,text,uuid) to service_role;
grant execute on function public.admin_referral_participant_update_v1(uuid,text,uuid,text,text,uuid) to service_role;
grant execute on function public.admin_referral_tracking_link_create_v1(uuid,text,uuid,text,text,text) to service_role;
grant execute on function public.referral_leaderboard_v1(date,date) to service_role;
