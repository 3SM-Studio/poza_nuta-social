-- Analytics V2.1 correctness freeze:
-- exclusive session-acquisition reporting, mathematically valid rates, and
-- atomic narrowly-scoped admin mutations with append-only audit history.

alter function public.touch_updated_at() set search_path = public;

-- Official destinations are always HTTPS. Existing validated HTTP rows are
-- upgraded in place before the stricter constraint is installed.
update public.destinations
set url = regexp_replace(url, '^http://', 'https://', 'i')
where url ~* '^http://';

alter table public.destinations drop constraint if exists destinations_official_domain;
alter table public.destinations
  add constraint destinations_official_domain check (
    (slug = 'instagram' and url ~* '^https://([a-z0-9-]+\.)*instagram\.com([/:?#]|$)') or
    (slug = 'tiktok' and url ~* '^https://([a-z0-9-]+\.)*tiktok\.com([/:?#]|$)') or
    (slug = 'facebook' and url ~* '^https://([a-z0-9-]+\.)*(facebook\.com|fb\.com)([/:?#]|$)') or
    (slug = 'youtube' and url ~* '^https://([a-z0-9-]+\.)*(youtube\.com|youtu\.be)([/:?#]|$)') or
    (slug = 'website' and url ~* '^https://([a-z0-9-]+\.)*pozanuta\.pl([/:?#]|$)')
  ) not valid;
alter table public.destinations validate constraint destinations_official_domain;

-- A signed, server-resolved tracking link is stronger acquisition evidence
-- than client-observed UTM/referrer input. Keep the first owned acquisition;
-- otherwise keep the first eligible non-direct acquisition with direct fallback.
create or replace function public.preserve_session_acquisition_v1()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if nullif(old.session_acquisition->>'trackingLinkId', '') is not null then
    new.session_acquisition := old.session_acquisition;
  elsif nullif(new.current_attribution->>'trackingLinkId', '') is not null then
    new.session_acquisition := new.current_attribution;
  elsif coalesce(old.session_acquisition->>'source', 'direct') <> 'direct' then
    new.session_acquisition := old.session_acquisition;
  elsif coalesce(new.session_acquisition->>'source', 'direct') = 'direct' then
    new.session_acquisition := old.session_acquisition;
  end if;
  return new;
end;
$$;

drop trigger if exists analytics_sessions_v2_preserve_acquisition on public.analytics_sessions_v2;
create trigger analytics_sessions_v2_preserve_acquisition
before update of session_acquisition on public.analytics_sessions_v2
for each row execute function public.preserve_session_acquisition_v1();

revoke all on function public.preserve_session_acquisition_v1() from public, anon, authenticated;

create or replace function public.assert_admin_editor_v1(p_actor_user_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1
    from public.admin_profiles
    where user_id = p_actor_user_id
      and role in ('owner', 'admin')
  ) then
    raise exception 'admin_editor_required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_campaign_create_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_name text,
  p_slug text,
  p_starts_on date,
  p_ends_on date
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_new jsonb;
begin
  perform public.assert_admin_editor_v1(p_actor_user_id);

  insert into public.campaigns as c (name, slug, status, starts_on, ends_on)
  values (p_name, p_slug, 'active', p_starts_on, p_ends_on)
  returning c.id, to_jsonb(c) into v_id, v_new;

  insert into public.audit_log (
    actor_user_id, actor_email, action, entity_type, entity_id, new_value
  ) values (
    p_actor_user_id, p_actor_email, 'campaign.create', 'campaign', v_id::text, v_new
  );

  return jsonb_build_object('id', v_id, 'row', v_new);
end;
$$;

create or replace function public.admin_campaign_archive_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_campaign_id uuid
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
  perform public.assert_admin_editor_v1(p_actor_user_id);

  select to_jsonb(c) into v_old
  from public.campaigns c
  where c.id = p_campaign_id
  for update;
  if not found then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;

  update public.campaigns as c
  set status = 'archived'
  where c.id = p_campaign_id
  returning to_jsonb(c) into v_new;

  insert into public.audit_log (
    actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value
  ) values (
    p_actor_user_id, p_actor_email, 'campaign.archive', 'campaign', p_campaign_id::text, v_old, v_new
  );

  return jsonb_build_object('id', p_campaign_id, 'row', v_new);
end;
$$;

create or replace function public.admin_destination_upsert_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_label text,
  p_slug text,
  p_url text,
  p_icon text,
  p_description text,
  p_sort_order integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_old jsonb;
  v_new jsonb;
  v_action text;
begin
  perform public.assert_admin_editor_v1(p_actor_user_id);

  select to_jsonb(d) into v_old
  from public.destinations d
  where d.slug = p_slug
  for update;

  if found then
    update public.destinations as d
    set label = p_label,
        url = p_url,
        icon = p_icon,
        description = p_description,
        sort_order = p_sort_order,
        active = true
    where d.slug = p_slug
    returning d.id, to_jsonb(d) into v_id, v_new;
    v_action := 'destination.update';
  else
    insert into public.destinations as d (
      label, slug, url, icon, description, sort_order, active
    ) values (
      p_label, p_slug, p_url, p_icon, p_description, p_sort_order, true
    )
    returning d.id, to_jsonb(d) into v_id, v_new;
    v_action := 'destination.create';
  end if;

  insert into public.audit_log (
    actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value
  ) values (
    p_actor_user_id, p_actor_email, v_action, 'destination', v_id::text, v_old, v_new
  );

  return jsonb_build_object('id', v_id, 'row', v_new);
end;
$$;

create or replace function public.admin_destination_toggle_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_destination_id uuid
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
  perform public.assert_admin_editor_v1(p_actor_user_id);

  select to_jsonb(d) into v_old
  from public.destinations d
  where d.id = p_destination_id
  for update;
  if not found then
    raise exception 'destination_not_found' using errcode = 'P0002';
  end if;

  update public.destinations as d
  set active = not d.active
  where d.id = p_destination_id
  returning to_jsonb(d) into v_new;

  insert into public.audit_log (
    actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value
  ) values (
    p_actor_user_id, p_actor_email, 'destination.toggle', 'destination', p_destination_id::text, v_old, v_new
  );

  return jsonb_build_object('id', p_destination_id, 'row', v_new);
end;
$$;

create or replace function public.admin_tracking_link_create_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_code text,
  p_label text,
  p_campaign_id uuid,
  p_channel_group text,
  p_source text,
  p_medium text,
  p_asset text,
  p_asset_slug text,
  p_placement text,
  p_placement_slug text,
  p_landing_path text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_asset_id uuid;
  v_placement_id uuid;
  v_id uuid;
  v_new jsonb;
begin
  perform public.assert_admin_editor_v1(p_actor_user_id);

  if nullif(p_asset, '') is not null then
    insert into public.analytics_assets as a (campaign_id, slug, label)
    values (p_campaign_id, p_asset_slug, p_asset)
    on conflict (campaign_id, slug) do update set label = excluded.label
    returning a.id into v_asset_id;
  end if;

  if nullif(p_placement, '') is not null then
    insert into public.analytics_placements as p (slug, label)
    values (p_placement_slug, p_placement)
    on conflict (slug) do update set label = excluded.label
    returning p.id into v_placement_id;
  end if;

  insert into public.tracking_links as t (
    code, label, campaign_id, channel_group, source, medium,
    asset, placement, asset_id, placement_id, landing_path, active
  ) values (
    p_code, p_label, p_campaign_id, p_channel_group, p_source, p_medium,
    p_asset, p_placement, v_asset_id, v_placement_id, p_landing_path, true
  )
  returning t.id, to_jsonb(t) into v_id, v_new;

  insert into public.audit_log (
    actor_user_id, actor_email, action, entity_type, entity_id, new_value
  ) values (
    p_actor_user_id, p_actor_email, 'tracking_link.create', 'tracking_link', v_id::text, v_new
  );

  return jsonb_build_object('id', v_id, 'row', v_new);
end;
$$;

create or replace function public.admin_tracking_link_toggle_v1(
  p_actor_user_id uuid,
  p_actor_email text,
  p_tracking_link_id uuid
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
  perform public.assert_admin_editor_v1(p_actor_user_id);

  select to_jsonb(t) into v_old
  from public.tracking_links t
  where t.id = p_tracking_link_id
  for update;
  if not found then
    raise exception 'tracking_link_not_found' using errcode = 'P0002';
  end if;

  update public.tracking_links as t
  set active = not t.active
  where t.id = p_tracking_link_id
  returning to_jsonb(t) into v_new;

  insert into public.audit_log (
    actor_user_id, actor_email, action, entity_type, entity_id, old_value, new_value
  ) values (
    p_actor_user_id, p_actor_email, 'tracking_link.toggle', 'tracking_link', p_tracking_link_id::text, v_old, v_new
  );

  return jsonb_build_object('id', p_tracking_link_id, 'row', v_new);
end;
$$;

create or replace function public.analytics_dashboard_v2(
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
  ), eligible as (
    select e.*
    from public.analytics_events_v2 e, bounds b
    where e.occurred_at >= b.from_ts
      and e.occurred_at < b.to_ts
      and e.environment = 'production'
      and e.traffic_class = 'external'
  ), session_metrics as (
    select session_id,
      bool_or(event_name = 'outbound_click') outbound,
      count(distinct destination_slug) filter (where event_name = 'outbound_click') destinations,
      bool_or(event_name = 'hub_resumed') resumed,
      bool_or(event_name in ('contact_view', 'contact_click')) contact_interest,
      bool_or(event_name = 'contact_view') contact_view,
      bool_or(event_name = 'contact_click') contact_click
    from eligible
    group by session_id
  ), acquisition_sessions as (
    select s.session_id,
      s.session_acquisition acquisition,
      coalesce(acquisition_event.dimension_snapshots, '{}'::jsonb) snapshots,
      acquisition_event.occurred_at acquisition_occurred_at
    from session_metrics sm
    join public.analytics_sessions_v2 s on s.session_id = sm.session_id
    left join lateral (
      select e.dimension_snapshots, e.occurred_at
      from public.analytics_events_v2 e
      where e.session_id = s.session_id
        and e.attributed_context = s.session_acquisition
      order by e.session_sequence
      limit 1
    ) acquisition_event on true
  ), totals as (
    select
      (select count(*) from session_metrics)::int session_count,
      (select count(*) from session_metrics where outbound)::int outbound_sessions,
      (select count(*) from eligible where event_name = 'outbound_click')::int outbound_clicks,
      (select count(*) from eligible where event_name = 'tracking_entry')::int tracking_entries,
      (select count(*) from eligible where event_name = 'page_view')::int page_views,
      (select count(distinct visitor_id) from eligible where visitor_id is not null)::int visitors,
      (select count(distinct e.visitor_id) from eligible e join public.analytics_visitors v on v.visitor_id = e.visitor_id, bounds b where v.first_seen_at >= b.from_ts and v.first_seen_at < b.to_ts)::int new_visitors,
      (select count(distinct e.visitor_id) from eligible e join public.analytics_visitors v on v.visitor_id = e.visitor_id, bounds b where v.first_seen_at < b.from_ts)::int returning_visitors,
      (select count(*) from session_metrics where destinations >= 2)::int multi_destination_sessions,
      (select count(*) from session_metrics where outbound and resumed)::int return_sessions,
      (select count(*) from session_metrics where contact_interest)::int contact_sessions,
      (select count(*) from session_metrics where contact_view and contact_click)::int contact_click_sessions,
      (select count(*) from session_metrics where contact_view)::int contact_view_sessions
  )
  select jsonb_build_object(
    'pageViews', page_views,
    'trackingEntries', tracking_entries,
    'sessions', session_count,
    'visitors', visitors,
    'newVisitors', new_visitors,
    'returningVisitors', returning_visitors,
    'returningVisitorRate', case when visitors > 0 then round(returning_visitors::numeric / visitors * 100, 2) else 0 end,
    'outboundSessions', outbound_sessions,
    'outboundSessionRate', case when session_count > 0 then round(outbound_sessions::numeric / session_count * 100, 2) else 0 end,
    'outboundClicks', outbound_clicks,
    'clicksPerOutboundSession', case when outbound_sessions > 0 then round(outbound_clicks::numeric / outbound_sessions, 2) else 0 end,
    'multiDestinationSessions', multi_destination_sessions,
    'multiDestinationSessionRate', case when outbound_sessions > 0 then round(multi_destination_sessions::numeric / outbound_sessions * 100, 2) else 0 end,
    'returnToHubSessions', return_sessions,
    'returnToHubRate', case when outbound_sessions > 0 then round(return_sessions::numeric / outbound_sessions * 100, 2) else 0 end,
    'contactInterestSessions', contact_sessions,
    'contactInterestRate', case when session_count > 0 then round(contact_sessions::numeric / session_count * 100, 2) else 0 end,
    'contactClickRate', case when contact_view_sessions > 0 then round(contact_click_sessions::numeric / contact_view_sessions * 100, 2) else 0 end,
    'topSources', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc, label)
      from (
        select coalesce(acquisition->>'source', 'direct') label, count(*)::int value
        from acquisition_sessions
        group by 1
        order by 2 desc, 1
        limit 8
      ) x
    ), '[]'::jsonb),
    'topCampaigns', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc, label)
      from (
        select (array_agg(label order by acquisition_occurred_at desc nulls last, session_id))[1] label,
          count(*)::int value
        from (
          select session_id,
            case
              when nullif(acquisition->>'campaignId', '') is not null then 'id:' || (acquisition->>'campaignId')
              else 'text:' || coalesce(nullif(acquisition->>'campaign', ''), '__none__')
            end campaign_key,
            coalesce(nullif(snapshots->>'campaignLabel', ''), nullif(acquisition->>'campaign', ''), 'Bez kampanii') label,
            acquisition_occurred_at
          from acquisition_sessions
        ) campaign_sessions
        group by campaign_key
        order by value desc, label
        limit 8
      ) x
    ), '[]'::jsonb),
    'topAssets', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc, label)
      from (
        select (array_agg(label order by acquisition_occurred_at desc nulls last, session_id))[1] label,
          count(*)::int value
        from (
          select session_id,
            coalesce('id:' || nullif(acquisition->>'assetId', ''), 'text:' || nullif(snapshots->>'assetLabel', '')) asset_key,
            nullif(snapshots->>'assetLabel', '') label,
            acquisition_occurred_at
          from acquisition_sessions
        ) asset_sessions
        where asset_key is not null and label is not null
        group by asset_key
        order by value desc, label
        limit 8
      ) x
    ), '[]'::jsonb),
    'topPlacements', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc, label)
      from (
        select (array_agg(label order by acquisition_occurred_at desc nulls last, session_id))[1] label,
          count(*)::int value
        from (
          select session_id,
            coalesce('id:' || nullif(acquisition->>'placementId', ''), 'text:' || nullif(snapshots->>'placementLabel', '')) placement_key,
            nullif(snapshots->>'placementLabel', '') label,
            acquisition_occurred_at
          from acquisition_sessions
        ) placement_sessions
        where placement_key is not null and label is not null
        group by placement_key
        order by value desc, label
        limit 8
      ) x
    ), '[]'::jsonb),
    'topDestinations', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc, label)
      from (
        select coalesce(dimension_snapshots->>'destinationLabel', destination_slug, 'unknown') label,
          count(*)::int value
        from eligible
        where event_name = 'outbound_click'
        group by 1
        order by 2 desc, 1
        limit 8
      ) x
    ), '[]'::jsonb),
    'topTrackingLinks', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc, label)
      from (
        select (array_agg(label order by acquisition_occurred_at desc nulls last, session_id))[1] label,
          count(*)::int value
        from (
          select session_id,
            coalesce('id:' || nullif(acquisition->>'trackingLinkId', ''), 'text:' || nullif(snapshots->>'trackingLinkLabel', '')) link_key,
            nullif(snapshots->>'trackingLinkLabel', '') label,
            acquisition_occurred_at
          from acquisition_sessions
        ) link_sessions
        where link_key is not null and label is not null
        group by link_key
        order by value desc, label
        limit 8
      ) x
    ), '[]'::jsonb),
    'timeSeries', coalesce((
      select jsonb_agg(jsonb_build_object('date', metric_day::text, 'sessions', session_count, 'outboundSessions', outbound_count) order by metric_day)
      from (
        select (occurred_at at time zone 'Europe/Warsaw')::date metric_day,
          count(distinct session_id)::int session_count,
          count(distinct session_id) filter (where event_name = 'outbound_click')::int outbound_count
        from eligible
        group by 1
        order by 1
      ) x
    ), '[]'::jsonb),
    'trafficBreakdown', coalesce((
      select jsonb_agg(jsonb_build_object('label', traffic_class, 'value', value) order by value desc, traffic_class)
      from (
        select e.traffic_class, count(distinct e.session_id)::int value
        from public.analytics_events_v2 e, bounds b
        where e.occurred_at >= b.from_ts
          and e.occurred_at < b.to_ts
          and e.environment = 'production'
        group by e.traffic_class
      ) x
    ), '[]'::jsonb)
  )
  from totals;
$$;

revoke all on function public.assert_admin_editor_v1(uuid) from public, anon, authenticated;
revoke all on function public.admin_campaign_create_v1(uuid,text,text,text,date,date) from public, anon, authenticated;
revoke all on function public.admin_campaign_archive_v1(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.admin_destination_upsert_v1(uuid,text,text,text,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.admin_destination_toggle_v1(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.admin_tracking_link_create_v1(uuid,text,text,text,uuid,text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.admin_tracking_link_toggle_v1(uuid,text,uuid) from public, anon, authenticated;

grant execute on function public.assert_admin_editor_v1(uuid) to service_role;
grant execute on function public.admin_campaign_create_v1(uuid,text,text,text,date,date) to service_role;
grant execute on function public.admin_campaign_archive_v1(uuid,text,uuid) to service_role;
grant execute on function public.admin_destination_upsert_v1(uuid,text,text,text,text,text,text,integer) to service_role;
grant execute on function public.admin_destination_toggle_v1(uuid,text,uuid) to service_role;
grant execute on function public.admin_tracking_link_create_v1(uuid,text,text,text,uuid,text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.admin_tracking_link_toggle_v1(uuid,text,uuid) to service_role;

revoke all on function public.analytics_dashboard_v2(date,date) from public, anon, authenticated;
grant execute on function public.analytics_dashboard_v2(date,date) to service_role;
