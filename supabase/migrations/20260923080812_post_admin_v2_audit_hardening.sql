-- Preserve Admin V2 invitation identity while making pending role changes
-- auditable and repeated delivery attempts safe.

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
  v_old jsonb;
begin
  v_actor_role := public.assert_admin_role_v2(p_actor_user_id, array['owner','admin']);
  if p_role is null or p_role not in ('admin','viewer') or (v_actor_role = 'admin' and p_role <> 'viewer') then
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
    if v_existing.role <> p_role then
      if v_actor_role <> 'owner' then
        raise exception 'invitation_role_forbidden' using errcode = '42501';
      end if;
      v_old := to_jsonb(v_existing);
      update public.admin_invitations
      set role = p_role
      where id = v_existing.id
      returning * into v_existing;
      insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value)
      values (p_actor_user_id, p_actor_email, 'admin.invitation.role_change', 'admin_invitation',
        v_existing.id::text, v_old, to_jsonb(v_existing));
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

-- Keep referral identity and metrics stable. The displayed historical snapshot is
-- the latest acquisition snapshot by event time, never by random session UUID.
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
      snap.label, snap.acquisition_at, snap.acquisition_event_id
    from public.analytics_sessions_v2 s
    join eligible_sessions es on es.session_id = s.session_id
    left join lateral (
      select nullif(e.dimension_snapshots->>'referralParticipantLabel','') label,
             e.occurred_at acquisition_at, e.id acquisition_event_id
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
      max(a.label) label, a.acquisition_at, a.acquisition_event_id
    from acquired a
    join eligible_events e on e.session_id = a.session_id
    group by a.participant_id, a.session_id, a.acquisition_at, a.acquisition_event_id
  ), session_rollup as (
    select participant_id,
      count(*)::int acquired_sessions,
      count(*) filter (where outbound)::int outbound_sessions,
      coalesce(sum(outbound_clicks),0)::int outbound_clicks,
      count(*) filter (where destinations >= 2)::int multi_destination_sessions,
      count(*) filter (where contact_interest)::int contact_interest_sessions,
      (array_agg(label order by acquisition_at desc nulls last, acquisition_event_id desc) filter (where label is not null))[1] snapshot_label
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
  if (v_old->>'expires_at')::timestamptz <= now() then
    raise exception 'invitation_expired' using errcode = '22023';
  end if;
  -- A failed delivery is immediately retryable. Pending delivery is cooled down
  -- so duplicate form submissions cannot send a second email or count a new attempt.
  if v_old->>'status' = 'pending'
    and (v_old->>'attempt_count')::integer > 0
    and (v_old->>'last_attempt_at')::timestamptz > now() - interval '2 minutes'
  then
    return v_old || jsonb_build_object('deliveryStarted', false);
  end if;

  update public.admin_invitations i
  set status = 'pending', delivery_status = 'not_attempted', failure_code = null,
      attempt_count = i.attempt_count + 1, last_attempt_at = now()
  where i.id = p_invitation_id
  returning to_jsonb(i) into v_new;
  insert into public.audit_log (actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value)
  values (p_actor_user_id, p_actor_email, 'admin.invitation.delivery_begin', 'admin_invitation', p_invitation_id::text, v_old, v_new);
  return v_new || jsonb_build_object('deliveryStarted', true);
end;
$$;
