-- Direct profile updates lock their row before the deferred active-owner guard
-- takes the advisory lock. Admin RPCs must use the same order to avoid a
-- row/advisory deadlock during concurrent ownership changes.

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
  perform public.assert_admin_role_v2(p_actor_user_id, array['owner']);
  if p_role not in ('admin','viewer') or p_status not in ('active','inactive') then
    raise exception 'invalid_member_update' using errcode = '22023';
  end if;
  select to_jsonb(p) into v_old from public.admin_profiles p
  where p.user_id = p_target_user_id for update;
  if not found then raise exception 'member_not_found' using errcode = 'P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended('admin_profiles.active_owner', 0));
  perform public.assert_admin_role_v2(p_actor_user_id, array['owner']);
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
  perform public.assert_admin_role_v2(p_actor_user_id, array['owner']);
  perform 1 from public.admin_profiles
  where user_id in (p_actor_user_id, p_target_user_id)
  order by user_id for update;
  perform pg_advisory_xact_lock(hashtextextended('admin_profiles.active_owner', 0));
  perform public.assert_admin_role_v2(p_actor_user_id, array['owner']);
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
