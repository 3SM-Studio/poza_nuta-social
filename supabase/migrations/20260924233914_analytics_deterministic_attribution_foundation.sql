-- Read-time event credit. The outcome row alone supplies both the acquisition
-- basis and historical IDs. Current graph relations are never used as credit.
create function public.analytics_attribution_context_id_v1(p_context jsonb, p_key text)
returns uuid language sql immutable parallel safe security invoker
set search_path = public as $$
  select case when p_context->>p_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (p_context->>p_key)::uuid end
$$;
revoke all on function public.analytics_attribution_context_id_v1(jsonb,text) from public, anon, authenticated;
grant execute on function public.analytics_attribution_context_id_v1(jsonb,text) to service_role;

create function public.analytics_deterministic_attribution_v1(
  p_project_key text, p_from_date date, p_to_date_exclusive date, p_scope text
) returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_result jsonb;
begin
  if p_project_key is distinct from 'poza_nuta'
    or p_scope is null or p_scope not in ('business','diagnostic')
    or p_from_date is null or p_to_date_exclusive is null
    or p_to_date_exclusive <= p_from_date or p_to_date_exclusive > p_from_date + 366 then
    raise exception 'invalid_attribution_request';
  end if;

  with eligible as materialized (
    select e.event_name, 'cookieless'::text mode, null::uuid session_id,
      (e.campaign_id is not null or e.asset_id is not null or e.placement_id is not null
        or e.tracking_link_id is not null or e.utm_source is not null or e.referrer_host is not null) direct_context,
      false persisted_context,
      e.campaign_id direct_campaign_id, e.asset_id direct_asset_id,
      e.placement_id direct_placement_id, e.tracking_link_id direct_link_id,
      null::uuid persisted_campaign_id, null::uuid persisted_asset_id,
      null::uuid persisted_placement_id, null::uuid persisted_link_id
    from public.analytics_cookieless_events e
    where e.project_key = p_project_key
      and e.event_name in ('outbound_click','contact_click')
      and public.analytics_reporting_eligible_v1(p_scope,e.environment,e.traffic_class)
      and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
      and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
    union all
    select e.event_name, 'consented'::text mode, e.session_id,
      (nullif(e.observed_context->>'source','') is distinct from null
        and e.observed_context->>'source' <> 'direct'
        or public.analytics_attribution_context_id_v1(e.observed_context,'campaignId') is not null
        or public.analytics_attribution_context_id_v1(e.observed_context,'assetId') is not null
        or public.analytics_attribution_context_id_v1(e.observed_context,'placementId') is not null
        or public.analytics_attribution_context_id_v1(e.observed_context,'trackingLinkId') is not null
        or e.tracking_link_id is not null) direct_context,
      (nullif(e.attributed_context->>'source','') is distinct from null
        and e.attributed_context->>'source' <> 'direct'
        or public.analytics_attribution_context_id_v1(e.attributed_context,'campaignId') is not null
        or public.analytics_attribution_context_id_v1(e.attributed_context,'assetId') is not null
        or public.analytics_attribution_context_id_v1(e.attributed_context,'placementId') is not null
        or public.analytics_attribution_context_id_v1(e.attributed_context,'trackingLinkId') is not null) persisted_context,
      public.analytics_attribution_context_id_v1(e.observed_context,'campaignId'),
      public.analytics_attribution_context_id_v1(e.observed_context,'assetId'),
      public.analytics_attribution_context_id_v1(e.observed_context,'placementId'),
      coalesce(public.analytics_attribution_context_id_v1(e.observed_context,'trackingLinkId'),e.tracking_link_id),
      public.analytics_attribution_context_id_v1(e.attributed_context,'campaignId'),
      public.analytics_attribution_context_id_v1(e.attributed_context,'assetId'),
      public.analytics_attribution_context_id_v1(e.attributed_context,'placementId'),
      public.analytics_attribution_context_id_v1(e.attributed_context,'trackingLinkId')
    from public.analytics_events_v2 e
    where e.analytics_consent = true and e.schema_version = 1
      and e.event_name in ('outbound_click','contact_click')
      and public.analytics_reporting_eligible_v1(p_scope,e.environment,e.traffic_class)
      and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
      and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
  ), credited as materialized (
    select event_name, mode, session_id,
      case when direct_context then 'direct_observed'
        when mode = 'consented' and persisted_context then 'persisted_consented'
        else 'unattributed' end basis,
      case when direct_context then direct_campaign_id when persisted_context then persisted_campaign_id end campaign_id,
      case when direct_context then direct_asset_id when persisted_context then persisted_asset_id end asset_id,
      case when direct_context then direct_placement_id when persisted_context then persisted_placement_id end placement_id,
      case when direct_context then direct_link_id when persisted_context then persisted_link_id end tracking_link_id
    from eligible
  ), summary as (
    select count(*) total, count(*) filter (where basis <> 'unattributed') attributed,
      count(*) filter (where basis = 'unattributed') unattributed,
      count(*) filter (where basis = 'direct_observed') direct_observed,
      count(*) filter (where basis = 'persisted_consented') persisted_consented,
      count(*) filter (where basis <> 'unattributed' and campaign_id is not null) campaign_attributed,
      count(*) filter (where basis <> 'unattributed' and campaign_id is null) partial_context,
      count(distinct session_id) filter (where mode = 'consented' and basis <> 'unattributed') consented_sessions_with_attributed_outcome
    from credited
  ), splits as (
    select event_name, mode, basis, count(*) events
    from credited group by event_name, mode, basis
  ), campaign_counts as (
    select campaign_id, event_name, basis, count(*) events
    from credited where campaign_id is not null and basis <> 'unattributed'
    group by campaign_id,event_name,basis
  ), campaign_groups as (
    select campaign_id, sum(events) events,
      jsonb_agg(jsonb_build_object('eventName',event_name,'basis',basis,'events',events)
        order by event_name,basis) outcomes
    from campaign_counts group by campaign_id
  ), graph_counts as (
    select 'asset'::text entity_type, asset_id entity_id, campaign_id, event_name, basis, count(*) events
    from credited where asset_id is not null and basis <> 'unattributed'
    group by asset_id,campaign_id,event_name,basis
    union all
    select 'placement',placement_id,campaign_id,event_name,basis,count(*)
    from credited where placement_id is not null and basis <> 'unattributed'
    group by placement_id,campaign_id,event_name,basis
    union all
    select 'tracking_link',tracking_link_id,campaign_id,event_name,basis,count(*)
    from credited where tracking_link_id is not null and basis <> 'unattributed'
    group by tracking_link_id,campaign_id,event_name,basis
  )
  select jsonb_build_object(
    'scope',p_scope,'fromDate',p_from_date,'toDateExclusive',p_to_date_exclusive,
    'summary',jsonb_build_object(
      'total',s.total,'attributed',s.attributed,'unattributed',s.unattributed,
      'directObserved',s.direct_observed,'persistedConsented',s.persisted_consented,
      'campaignAttributed',s.campaign_attributed,'partialContext',s.partial_context,
      'consentedSessionsWithAttributedOutcome',s.consented_sessions_with_attributed_outcome,
      'coverage',case when s.total = 0 then null else round(s.attributed::numeric/s.total,4) end),
    'splits',coalesce((select jsonb_agg(jsonb_build_object('eventName',event_name,'mode',mode,'basis',basis,'events',events)
      order by event_name,mode,basis) from splits),'[]'::jsonb),
    'campaigns',coalesce((select jsonb_agg(jsonb_build_object(
      'id',x.campaign_id,'name',c.name,'status',c.status,
      'events',x.events,'outcomes',x.outcomes)
      order by x.events desc,x.campaign_id)
      from (select * from campaign_groups order by events desc,campaign_id limit 100) x
      left join public.campaigns c on c.id=x.campaign_id),'[]'::jsonb),
    'campaignRows', (select count(*) from campaign_groups),
    'graph',coalesce((select jsonb_agg(jsonb_build_object(
      'entityType',x.entity_type,'id',x.entity_id,'campaignId',x.campaign_id,
      'label',case x.entity_type when 'asset' then a.label when 'placement' then p.label else l.label end,
      'eventName',x.event_name,'basis',x.basis,'events',x.events)
      order by x.events desc,x.entity_type,x.entity_id,x.event_name,x.basis)
      from (select * from graph_counts order by events desc,entity_type,entity_id,event_name,basis limit 100) x
      left join public.analytics_assets a on x.entity_type='asset' and a.id=x.entity_id
      left join public.analytics_placements p on x.entity_type='placement' and p.id=x.entity_id
      left join public.tracking_links l on x.entity_type='tracking_link' and l.id=x.entity_id),'[]'::jsonb),
    'graphRows',(select count(*) from graph_counts)
  ) into v_result from summary s;
  return v_result;
end;
$$;
revoke all on function public.analytics_deterministic_attribution_v1(text,date,date,text) from public, anon, authenticated;
grant execute on function public.analytics_deterministic_attribution_v1(text,date,date,text) to service_role;
