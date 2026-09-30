-- Accepted-event acquisition context. A row is never joined to another event to
-- manufacture a cookieless journey. Event-owned IDs win over current link metadata.
-- The existing invoker-owned cookieless ingest and realtime read also require
-- these server grants. Public roles remain revoked and RLS stays enabled.
grant select, insert on table public.analytics_cookieless_events to service_role;

create function public.analytics_acquisition_event_rows_v1(
  p_project_key text, p_from_date date, p_to_date_exclusive date, p_scope text
)
returns table (
  mode text, event_name text, association text, campaign_id uuid,
  asset_id uuid, placement_id uuid, tracking_link_id uuid, destination_id uuid
)
language sql stable security invoker set search_path = public
as $$
  with consented as (
    select e.event_name, e.tracking_link_id, e.destination_id,
      case when e.observed_context->>'campaignId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (e.observed_context->>'campaignId')::uuid else t.campaign_id end direct_campaign_id,
      case when e.observed_context->>'assetId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (e.observed_context->>'assetId')::uuid else t.asset_id end direct_asset_id,
      case when e.observed_context->>'placementId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (e.observed_context->>'placementId')::uuid else t.placement_id end direct_placement_id,
      case when e.attributed_context->>'campaignId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (e.attributed_context->>'campaignId')::uuid end persisted_campaign_id,
      case when e.attributed_context->>'assetId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (e.attributed_context->>'assetId')::uuid end persisted_asset_id,
      case when e.attributed_context->>'placementId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (e.attributed_context->>'placementId')::uuid end persisted_placement_id,
      case when e.attributed_context->>'trackingLinkId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (e.attributed_context->>'trackingLinkId')::uuid end persisted_link_id
    from public.analytics_events_v2 e
    left join public.tracking_links t on t.id = e.tracking_link_id
    where e.analytics_consent = true
      and public.analytics_reporting_eligible_v1(p_scope, e.environment, e.traffic_class)
      and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
      and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
      and e.event_name in ('tracking_entry','page_view','outbound_click','contact_view','contact_click','hub_resumed')
  )
  select 'cookieless'::text, e.event_name,
    case when e.campaign_id is null then 'none' else 'direct' end,
    e.campaign_id, e.asset_id, e.placement_id, e.tracking_link_id, e.destination_id
  from public.analytics_cookieless_events e
  where e.project_key = p_project_key
    and public.analytics_reporting_eligible_v1(p_scope, e.environment, e.traffic_class)
    and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
    and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
  union all
  select 'consented'::text, c.event_name,
    case when c.direct_campaign_id is not null then 'direct'
      when c.persisted_campaign_id is not null then 'persisted' else 'none' end,
    coalesce(c.direct_campaign_id, c.persisted_campaign_id),
    case when c.direct_campaign_id is not null then c.direct_asset_id else c.persisted_asset_id end,
    case when c.direct_campaign_id is not null then c.direct_placement_id else c.persisted_placement_id end,
    case when c.direct_campaign_id is not null then c.tracking_link_id else c.persisted_link_id end,
    c.destination_id
  from consented c
$$;
revoke all on function public.analytics_acquisition_event_rows_v1(text,date,date,text) from public, anon, authenticated;
grant execute on function public.analytics_acquisition_event_rows_v1(text,date,date,text) to service_role;

create function public.analytics_acquisition_overview_v1(
  p_project_key text, p_from_date date, p_to_date_exclusive date,
  p_scope text, p_limit integer default 50, p_offset integer default 0
) returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare result jsonb;
begin
  if p_project_key is null or p_project_key !~ '^[a-z][a-z0-9_]{1,63}$'
    or p_scope is null or p_scope not in ('business','diagnostic')
    or p_from_date is null or p_to_date_exclusive is null
    or p_to_date_exclusive <= p_from_date or p_to_date_exclusive > p_from_date + 366
    or p_limit is null or p_limit < 1 or p_limit > 100
    or p_offset is null or p_offset < 0 then
    raise exception 'invalid_acquisition_range';
  end if;

  with events as materialized (
    select * from public.analytics_acquisition_event_rows_v1(p_project_key,p_from_date,p_to_date_exclusive,p_scope)
  ), counts as (
    select campaign_id,
      count(*) filter (where association = 'direct') direct_events,
      count(*) filter (where association = 'persisted') persisted_events,
      count(*) filter (where event_name = 'tracking_entry') tracking_entries,
      count(*) filter (where event_name = 'outbound_click') outbound_clicks,
      count(*) filter (where event_name = 'contact_click') contact_clicks,
      count(*) filter (where event_name = 'contact_view') contact_views
    from events where campaign_id is not null group by campaign_id
  ), campaign_keys as (
    select id from public.campaigns union select campaign_id from counts
  ), ranked as (
    select k.id, c.name, c.status,
      coalesce(n.direct_events,0) direct_events,
      coalesce(n.persisted_events,0) persisted_events,
      coalesce(n.tracking_entries,0) tracking_entries,
      coalesce(n.outbound_clicks,0) outbound_clicks,
      coalesce(n.contact_clicks,0) contact_clicks,
      coalesce(n.contact_views,0) contact_views
    from campaign_keys k
    left join public.campaigns c on c.id = k.id
    left join counts n on n.campaign_id = k.id
    order by coalesce(n.tracking_entries,0) desc,
      coalesce(n.outbound_clicks,0) desc, k.id
  ), paged as (
    select * from ranked limit p_limit offset p_offset
  ), totals as (
    select count(*) total_events,
      count(*) filter (where association = 'direct') direct_events,
      count(*) filter (where association = 'persisted') persisted_events,
      count(*) filter (where association = 'none') no_campaign_events,
      count(*) filter (where event_name = 'tracking_entry') tracking_entries,
      count(*) filter (where event_name = 'outbound_click') outbound_clicks,
      count(*) filter (where event_name = 'contact_click') contact_clicks,
      count(*) filter (where event_name = 'contact_view') contact_views
    from events
  )
  select jsonb_build_object(
    'scope',p_scope,'fromDate',p_from_date,'toDateExclusive',p_to_date_exclusive,
    'totalEvents',t.total_events,'directEvents',t.direct_events,
    'persistedEvents',t.persisted_events,'noCampaignEvents',t.no_campaign_events,
    'trackingEntries',t.tracking_entries,'outboundClicks',t.outbound_clicks,
    'contactClicks',t.contact_clicks,'contactViews',t.contact_views,
    'campaignCount',(select count(*) from ranked),
    'campaigns',coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'name',name,'status',status,'directEvents',direct_events,
      'persistedEvents',persisted_events,'trackingEntries',tracking_entries,
      'outboundClicks',outbound_clicks,'contactClicks',contact_clicks,
      'contactViews',contact_views) order by tracking_entries desc,outbound_clicks desc,id)
      from paged),'[]'::jsonb)
  ) into result from totals t;
  return result;
end;
$$;
revoke all on function public.analytics_acquisition_overview_v1(text,date,date,text,integer,integer) from public, anon, authenticated;
grant execute on function public.analytics_acquisition_overview_v1(text,date,date,text,integer,integer) to service_role;

create function public.analytics_acquisition_detail_v1(
  p_project_key text, p_from_date date, p_to_date_exclusive date,
  p_scope text, p_campaign_id uuid
) returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare result jsonb;
begin
  if p_project_key is null or p_project_key !~ '^[a-z][a-z0-9_]{1,63}$'
    or p_scope is null or p_scope not in ('business','diagnostic')
    or p_from_date is null or p_to_date_exclusive is null or p_campaign_id is null
    or p_to_date_exclusive <= p_from_date or p_to_date_exclusive > p_from_date + 366 then
    raise exception 'invalid_acquisition_range';
  end if;

  with events as materialized (
    select * from public.analytics_acquisition_event_rows_v1(p_project_key,p_from_date,p_to_date_exclusive,p_scope)
    where campaign_id = p_campaign_id
  ), dimensions as (
    select d.kind,d.id,e.association,e.event_name,count(*)::bigint n
    from events e
    cross join lateral (values
      ('campaign',e.campaign_id),('asset',e.asset_id),
      ('placement',e.placement_id),('link',e.tracking_link_id),
      ('destination',e.destination_id)
    ) d(kind,id)
    where d.id is not null
    group by d.kind,d.id,e.association,e.event_name
  ), links as (
    select l.* from public.tracking_links l where l.campaign_id = p_campaign_id
      or l.id in (select distinct tracking_link_id from events where tracking_link_id is not null)
  ), assets as (
    select a.* from public.analytics_assets a where a.campaign_id = p_campaign_id
      or a.id in (select distinct asset_id from links where asset_id is not null)
      or a.id in (select distinct asset_id from events where asset_id is not null)
  ), placements as (
    select p.* from public.analytics_placements p where p.id in (
      select placement_id from links where placement_id is not null
      union select placement_id from events where placement_id is not null
    )
  ), destinations as (
    select d.* from public.destinations d where d.id in
      (select distinct destination_id from events where destination_id is not null)
  )
  select jsonb_build_object(
    'scope',p_scope,'fromDate',p_from_date,'toDateExclusive',p_to_date_exclusive,
    'campaign',(select to_jsonb(c) from (
      select id,name,slug,status from public.campaigns where id = p_campaign_id
    ) c),
    'assets',coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'campaignId',campaign_id,'label',label,'slug',slug,'active',active)
      order by label,id) from assets),'[]'::jsonb),
    'placements',coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'label',label,'slug',slug,'type',placement_type,'active',active)
      order by label,id) from placements),'[]'::jsonb),
    'links',coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'label',label,'code',code,'campaignId',campaign_id,
      'assetId',asset_id,'placementId',placement_id,'distributionUnit',distribution_unit,
      'landingPath',landing_path,'active',active)
      order by label,id) from links),'[]'::jsonb),
    'destinations',coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'label',label,'slug',slug,'active',active)
      order by label,id) from destinations),'[]'::jsonb),
    'metrics',coalesce((select jsonb_agg(jsonb_build_object(
      'kind',kind,'id',id,'association',association,'eventName',event_name,'count',n)
      order by kind,id,association,event_name) from dimensions),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.analytics_acquisition_detail_v1(text,date,date,text,uuid) from public, anon, authenticated;
grant execute on function public.analytics_acquisition_detail_v1(text,date,date,text,uuid) to service_role;
