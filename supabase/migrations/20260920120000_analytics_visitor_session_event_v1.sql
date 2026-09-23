-- Analytics v1: consent-gated visitor -> session -> event model, normalized
-- assets/placements, historical snapshots, and atomic idempotent ingest.

create table public.analytics_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  slug text not null,
  label text not null,
  active_from timestamptz,
  active_to timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (campaign_id, slug),
  check (slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$'),
  check (active_to is null or active_from is null or active_to > active_from)
);

create table public.analytics_placements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  placement_type text not null default 'other' check (placement_type in ('venue','district','partner','distribution','digital','other')),
  active_from timestamptz,
  active_to timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$'),
  check (active_to is null or active_from is null or active_to > active_from)
);

alter table public.tracking_links
  add column if not exists channel_group text not null default 'offline',
  add column if not exists asset_id uuid references public.analytics_assets(id) on delete set null,
  add column if not exists placement_id uuid references public.analytics_placements(id) on delete set null,
  add column if not exists distribution_unit text,
  add column if not exists active_from timestamptz,
  add column if not exists active_to timestamptz;

update public.tracking_links
set channel_group = 'offline', source = 'unknown_offline', medium = 'qr'
where source = 'qr' and medium = 'offline';

alter table public.tracking_links
  add constraint tracking_links_channel_group_allowed check (channel_group in ('direct','offline','ai_referral','organic_search','organic_social','referral','email','paid_social','paid_search','other')) not valid,
  add constraint tracking_links_active_range check (active_to is null or active_from is null or active_to > active_from) not valid;
alter table public.tracking_links validate constraint tracking_links_channel_group_allowed;
alter table public.tracking_links validate constraint tracking_links_active_range;

alter table public.tracking_links drop constraint if exists tracking_links_landing_path_internal;
alter table public.tracking_links
  add constraint tracking_links_landing_path_public check (landing_path in ('/','/kontakt')) not valid;
alter table public.tracking_links validate constraint tracking_links_landing_path_public;

alter table public.destinations
  add constraint destinations_official_domain check (
    (slug = 'instagram' and url ~* '^https?://([a-z0-9-]+\.)*instagram\.com([/:?#]|$)') or
    (slug = 'tiktok' and url ~* '^https?://([a-z0-9-]+\.)*tiktok\.com([/:?#]|$)') or
    (slug = 'facebook' and url ~* '^https?://([a-z0-9-]+\.)*(facebook\.com|fb\.com)([/:?#]|$)') or
    (slug = 'youtube' and url ~* '^https?://([a-z0-9-]+\.)*(youtube\.com|youtu\.be)([/:?#]|$)') or
    (slug = 'website' and url ~* '^https?://([a-z0-9-]+\.)*pozanuta\.pl([/:?#]|$)')
  ) not valid;
alter table public.destinations validate constraint destinations_official_domain;

insert into public.analytics_assets (campaign_id, slug, label)
select campaign_id,
  left(trim(both '-' from regexp_replace(lower(asset), '[^a-z0-9._-]+', '-', 'g')), 80),
  min(asset)
from public.tracking_links
where nullif(asset, '') is not null
group by campaign_id, left(trim(both '-' from regexp_replace(lower(asset), '[^a-z0-9._-]+', '-', 'g')), 80)
on conflict (campaign_id, slug) do nothing;

insert into public.analytics_placements (slug, label)
select left(trim(both '-' from regexp_replace(lower(placement), '[^a-z0-9._-]+', '-', 'g')), 80), min(placement)
from public.tracking_links
where nullif(placement, '') is not null
group by left(trim(both '-' from regexp_replace(lower(placement), '[^a-z0-9._-]+', '-', 'g')), 80)
on conflict (slug) do nothing;

update public.tracking_links t
set asset_id = a.id
from public.analytics_assets a
where t.asset_id is null
  and t.campaign_id is not distinct from a.campaign_id
  and a.slug = left(trim(both '-' from regexp_replace(lower(t.asset), '[^a-z0-9._-]+', '-', 'g')), 80);

update public.tracking_links t
set placement_id = p.id
from public.analytics_placements p
where t.placement_id is null
  and p.slug = left(trim(both '-' from regexp_replace(lower(t.placement), '[^a-z0-9._-]+', '-', 'g')), 80);

create table public.analytics_visitors (
  visitor_id uuid primary key,
  first_acquisition jsonb not null default '{}'::jsonb,
  consent_version smallint not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  check (jsonb_typeof(first_acquisition) = 'object'),
  check (last_seen_at >= first_seen_at)
);

create table public.analytics_sessions_v2 (
  session_id uuid primary key,
  visitor_id uuid references public.analytics_visitors(visitor_id) on delete set null,
  legacy_visit_id uuid unique,
  environment text not null check (environment in ('production','staging','preview','development','unknown')),
  traffic_class text not null check (traffic_class in ('external','internal','test','bot','unclassified')),
  analytics_consent boolean not null default false,
  marketing_consent boolean not null default false,
  session_acquisition jsonb not null default '{}'::jsonb,
  current_attribution jsonb not null default '{}'::jsonb,
  device_type text check (device_type in ('mobile','tablet','desktop')),
  browser_family text,
  os_family text,
  next_sequence integer not null default 0 check (next_sequence >= 0),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  historical_precision text not null default 'v1' check (historical_precision in ('v1','legacy_limited')),
  check (jsonb_typeof(session_acquisition) = 'object'),
  check (jsonb_typeof(current_attribution) = 'object'),
  check (last_seen_at >= started_at),
  check (expires_at >= last_seen_at)
);

create table public.analytics_events_v2 (
  id bigint generated always as identity primary key,
  event_id uuid not null unique,
  event_name text not null,
  schema_version smallint not null default 1,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  visitor_id uuid references public.analytics_visitors(visitor_id) on delete set null,
  session_id uuid not null references public.analytics_sessions_v2(session_id) on delete restrict,
  session_sequence integer not null check (session_sequence > 0),
  environment text not null check (environment in ('production','staging','preview','development','unknown')),
  traffic_class text not null check (traffic_class in ('external','internal','test','bot','unclassified')),
  analytics_consent boolean not null default false,
  marketing_consent boolean not null default false,
  path text not null check (path in ('/','/kontakt') or path ~ '^/(r|go)/[A-Za-z0-9_-]{1,80}$'),
  observed_context jsonb not null default '{}'::jsonb,
  attributed_context jsonb not null default '{}'::jsonb,
  dimension_snapshots jsonb not null default '{}'::jsonb,
  tracking_link_id uuid references public.tracking_links(id) on delete set null,
  destination_id uuid references public.destinations(id) on delete set null,
  destination_slug text,
  device_type text check (device_type in ('mobile','tablet','desktop')),
  browser_family text,
  os_family text,
  metadata jsonb not null default '{}'::jsonb,
  migration_source text,
  historical_precision text not null default 'v1' check (historical_precision in ('v1','legacy_limited')),
  unique (session_id, session_sequence),
  check (event_name in ('tracking_entry','page_view','outbound_click','contact_view','contact_click','hub_resumed') or (schema_version = 0 and event_name = 'legacy_interaction')),
  check (jsonb_typeof(observed_context) = 'object'),
  check (jsonb_typeof(attributed_context) = 'object'),
  check (jsonb_typeof(dimension_snapshots) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (octet_length(metadata::text) <= 8192)
);

create table public.analytics_quality_daily (
  metric_date date not null,
  environment text not null,
  metric_name text not null,
  route text not null default 'ingest',
  value bigint not null default 0 check (value >= 0),
  updated_at timestamptz not null default now(),
  primary key (metric_date, environment, metric_name, route)
);

create index analytics_visitors_last_seen_idx on public.analytics_visitors (last_seen_at desc);
create index analytics_sessions_v2_visitor_idx on public.analytics_sessions_v2 (visitor_id, started_at desc);
create index analytics_sessions_v2_reporting_idx on public.analytics_sessions_v2 (environment, traffic_class, started_at desc);
create index analytics_events_v2_reporting_idx on public.analytics_events_v2 (environment, traffic_class, occurred_at desc);
create index analytics_events_v2_name_time_idx on public.analytics_events_v2 (event_name, occurred_at desc);
create index analytics_events_v2_session_idx on public.analytics_events_v2 (session_id, session_sequence);
create index analytics_events_v2_tracking_idx on public.analytics_events_v2 (tracking_link_id, occurred_at desc);
create index analytics_events_v2_destination_idx on public.analytics_events_v2 (destination_id, occurred_at desc);

alter table public.analytics_assets enable row level security;
alter table public.analytics_placements enable row level security;
alter table public.analytics_visitors enable row level security;
alter table public.analytics_sessions_v2 enable row level security;
alter table public.analytics_events_v2 enable row level security;
alter table public.analytics_quality_daily enable row level security;

drop trigger if exists analytics_assets_touch_updated_at on public.analytics_assets;
create trigger analytics_assets_touch_updated_at before update on public.analytics_assets
for each row execute function public.touch_updated_at();
drop trigger if exists analytics_placements_touch_updated_at on public.analytics_placements;
create trigger analytics_placements_touch_updated_at before update on public.analytics_placements
for each row execute function public.touch_updated_at();

-- Legacy backfill: preserve sessions/events but do not invent visitors,
-- consent, environment, classification, or observed-vs-attributed precision.
insert into public.analytics_sessions_v2 (
  session_id, legacy_visit_id, environment, traffic_class, analytics_consent, marketing_consent,
  session_acquisition, current_attribution, device_type, browser_family, os_family,
  next_sequence, started_at, last_seen_at, expires_at, historical_precision
)
select s.visit_id, s.visit_id, 'unknown', 'unclassified', false, false,
  jsonb_build_object('channelGroup',coalesce(t_first.channel_group,'other'),'source',coalesce(t_first.source,s.first_source),'medium',coalesce(t_first.medium,s.first_medium),'campaign',s.first_campaign,'content',s.first_content,'referrerHost',s.first_referrer_host,'campaignId',s.first_campaign_id,'trackingLinkId',s.first_tracking_link_id,'assetId',t_first.asset_id,'placementId',t_first.placement_id),
  jsonb_build_object('channelGroup',coalesce(t_last.channel_group,'other'),'source',coalesce(t_last.source,s.last_source),'medium',coalesce(t_last.medium,s.last_medium),'campaign',s.last_campaign,'content',s.last_content,'referrerHost',s.last_referrer_host,'campaignId',s.last_campaign_id,'trackingLinkId',s.last_tracking_link_id,'assetId',t_last.asset_id,'placementId',t_last.placement_id),
  s.device_type, s.browser_family, s.os_family, 0, s.first_seen_at, s.last_seen_at, s.last_seen_at + interval '30 minutes', 'legacy_limited'
from public.analytics_sessions s
left join public.tracking_links t_first on t_first.id = s.first_tracking_link_id
left join public.tracking_links t_last on t_last.id = s.last_tracking_link_id
on conflict (session_id) do nothing;

with ranked as (
  select e.*, row_number() over (partition by e.visit_id order by e.created_at, e.id)::int as seq
  from public.analytics_events e
), inserted as (
  insert into public.analytics_events_v2 (
    event_id, event_name, schema_version, occurred_at, received_at, session_id, session_sequence,
    environment, traffic_class, analytics_consent, marketing_consent, path,
    observed_context, attributed_context, dimension_snapshots, tracking_link_id, destination_id,
    destination_slug, device_type, browser_family, os_family, metadata, migration_source, historical_precision
  )
  select r.event_key,
    case r.event_type when 'entry' then 'tracking_entry' when 'interaction' then 'legacy_interaction' else r.event_type end,
    0, r.created_at, r.created_at, r.visit_id, r.seq, 'unknown', 'unclassified', false, false,
    case when r.path in ('/','/kontakt') or r.path ~ '^/(r|go)/[A-Za-z0-9_-]{1,80}$' then r.path else '/' end,
    jsonb_build_object('source',r.utm_source,'medium',r.utm_medium,'campaign',r.utm_campaign,'content',r.utm_content,'referrerHost',r.referrer_host),
    jsonb_build_object('channelGroup',coalesce(t.channel_group,'other'),'source',coalesce(t.source,r.source),'medium',coalesce(t.medium,r.medium),'campaignId',r.campaign_id,'trackingLinkId',r.tracking_link_id,'assetId',t.asset_id,'placementId',t.placement_id),
    jsonb_build_object('trackingLinkLabel',t.label,'campaignLabel',c.name,'campaignSlug',c.slug,'assetLabel',coalesce(a.label,t.asset),'placementLabel',coalesce(p.label,t.placement),'destinationLabel',d.label,'destinationSlug',r.destination_slug),
    r.tracking_link_id, r.destination_id, r.destination_slug, r.device_type, r.browser_family, r.os_family,
    r.metadata || jsonb_build_object('legacyEventId',r.id), 'analytics_events', 'legacy_limited'
  from ranked r
  left join public.tracking_links t on t.id = r.tracking_link_id
  left join public.campaigns c on c.id = r.campaign_id
  left join public.analytics_assets a on a.id = t.asset_id
  left join public.analytics_placements p on p.id = t.placement_id
  left join public.destinations d on d.id = r.destination_id
  on conflict (event_id) do nothing
  returning session_id, session_sequence
)
update public.analytics_sessions_v2 s
set next_sequence = greatest(s.next_sequence, x.max_sequence)
from (select session_id, max(session_sequence) max_sequence from inserted group by session_id) x
where s.session_id = x.session_id;

create or replace function public.analytics_ingest_event_v1(
  p_event_id uuid,
  p_event_name text,
  p_session_id uuid,
  p_visitor_id uuid,
  p_environment text,
  p_traffic_class text,
  p_analytics_consent boolean,
  p_marketing_consent boolean,
  p_path text,
  p_observed_context jsonb,
  p_attributed_context jsonb,
  p_dimension_snapshots jsonb,
  p_tracking_link_id uuid,
  p_destination_id uuid,
  p_destination_slug text,
  p_device_type text,
  p_browser_family text,
  p_os_family text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sequence integer;
  v_session_acquisition jsonb;
  v_current_attribution jsonb;
  v_existing record;
begin
  if p_event_name not in ('tracking_entry','page_view','outbound_click','contact_view','contact_click','hub_resumed') then raise exception 'invalid_event_name'; end if;
  if p_environment not in ('production','staging','preview','development') then raise exception 'invalid_environment'; end if;
  if p_traffic_class not in ('external','internal','test','bot') then raise exception 'invalid_traffic_class'; end if;
  if p_path not in ('/','/kontakt') and p_path !~ '^/(r|go)/[A-Za-z0-9_-]{1,80}$' then raise exception 'invalid_path'; end if;
  if jsonb_typeof(p_observed_context) <> 'object' or octet_length(p_observed_context::text) > 4096 then raise exception 'invalid_observed_context'; end if;
  if jsonb_typeof(p_attributed_context) <> 'object' or octet_length(p_attributed_context::text) > 4096 then raise exception 'invalid_attributed_context'; end if;
  if jsonb_typeof(p_dimension_snapshots) <> 'object' or octet_length(p_dimension_snapshots::text) > 4096 then raise exception 'invalid_dimension_snapshots'; end if;
  if jsonb_typeof(p_metadata) <> 'object' or octet_length(p_metadata::text) > 8192 then raise exception 'invalid_metadata'; end if;
  if p_visitor_id is not null and not p_analytics_consent then raise exception 'visitor_requires_analytics_consent'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));
  select event_id, session_sequence into v_existing from public.analytics_events_v2 where event_id = p_event_id;
  if found then
    insert into public.analytics_quality_daily (metric_date, environment, metric_name, route, value)
    values ((now() at time zone 'Europe/Warsaw')::date, p_environment, 'duplicate_event', 'ingest', 1)
    on conflict (metric_date, environment, metric_name, route) do update set value = analytics_quality_daily.value + 1, updated_at = now();
    return jsonb_build_object('stored', true, 'duplicate', true, 'eventId', v_existing.event_id, 'sessionSequence', v_existing.session_sequence);
  end if;

  if p_visitor_id is not null then
    insert into public.analytics_visitors (visitor_id, first_acquisition, consent_version)
    values (p_visitor_id, '{}'::jsonb, 1)
    on conflict (visitor_id) do update
    set last_seen_at = greatest(analytics_visitors.last_seen_at, clock_timestamp());
  end if;

  insert into public.analytics_sessions_v2 (
    session_id, visitor_id, environment, traffic_class, analytics_consent, marketing_consent,
    session_acquisition, current_attribution, device_type, browser_family, os_family,
    next_sequence, last_seen_at, expires_at
  ) values (
    p_session_id, p_visitor_id, p_environment, p_traffic_class, p_analytics_consent, p_marketing_consent,
    p_attributed_context, p_attributed_context, p_device_type, p_browser_family, p_os_family,
    1, now(), now() + interval '30 minutes'
  )
  on conflict (session_id) do update set
    visitor_id = case when excluded.analytics_consent then coalesce(analytics_sessions_v2.visitor_id, excluded.visitor_id) else null end,
    environment = excluded.environment,
    traffic_class = excluded.traffic_class,
    analytics_consent = excluded.analytics_consent,
    marketing_consent = excluded.marketing_consent,
    session_acquisition = case
      when coalesce(analytics_sessions_v2.session_acquisition->>'source','direct') = 'direct'
       and coalesce(excluded.session_acquisition->>'source','direct') <> 'direct'
      then excluded.session_acquisition else analytics_sessions_v2.session_acquisition end,
    current_attribution = case
      when coalesce(excluded.current_attribution->>'source','direct') = 'direct'
      then analytics_sessions_v2.current_attribution else excluded.current_attribution end,
    device_type = excluded.device_type,
    browser_family = excluded.browser_family,
    os_family = excluded.os_family,
    next_sequence = analytics_sessions_v2.next_sequence + 1,
    last_seen_at = greatest(analytics_sessions_v2.last_seen_at, clock_timestamp()),
    expires_at = greatest(analytics_sessions_v2.expires_at, clock_timestamp() + interval '30 minutes')
  returning next_sequence, session_acquisition, current_attribution
  into v_sequence, v_session_acquisition, v_current_attribution;

  if p_visitor_id is not null then
    update public.analytics_visitors
    set first_acquisition = v_session_acquisition,
        last_seen_at = greatest(last_seen_at, clock_timestamp())
    where visitor_id = p_visitor_id and first_acquisition = '{}'::jsonb;
  end if;

  insert into public.analytics_events_v2 (
    event_id, event_name, schema_version, visitor_id, session_id, session_sequence,
    environment, traffic_class, analytics_consent, marketing_consent, path,
    observed_context, attributed_context, dimension_snapshots, tracking_link_id, destination_id,
    destination_slug, device_type, browser_family, os_family, metadata
  ) values (
    p_event_id, p_event_name, 1, case when p_analytics_consent then p_visitor_id else null end, p_session_id, v_sequence,
    p_environment, p_traffic_class, p_analytics_consent, p_marketing_consent, p_path,
    p_observed_context, v_current_attribution, p_dimension_snapshots, p_tracking_link_id, p_destination_id,
    left(nullif(p_destination_slug,''),80), p_device_type, left(p_browser_family,40), left(p_os_family,40), p_metadata
  );

  insert into public.analytics_quality_daily (metric_date, environment, metric_name, route, value)
  values ((now() at time zone 'Europe/Warsaw')::date, p_environment, 'stored_event', 'ingest', 1)
  on conflict (metric_date, environment, metric_name, route) do update set value = analytics_quality_daily.value + 1, updated_at = now();

  return jsonb_build_object('stored', true, 'duplicate', false, 'eventId', p_event_id, 'sessionSequence', v_sequence,
    'sessionAcquisition', v_session_acquisition, 'attributedContext', v_current_attribution);
end;
$$;

create or replace function public.analytics_dashboard_v2(p_from_date date, p_to_date_exclusive date)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  with bounds as (
    select (p_from_date::timestamp at time zone 'Europe/Warsaw') from_ts,
           (p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw') to_ts
  ), eligible as (
    select e.* from public.analytics_events_v2 e, bounds b
    where e.occurred_at >= b.from_ts and e.occurred_at < b.to_ts
      and e.environment = 'production' and e.traffic_class = 'external'
  ), sessions as (
    select session_id,
      bool_or(event_name='outbound_click') outbound,
      count(distinct destination_slug) filter (where event_name='outbound_click') destinations,
      bool_or(event_name='hub_resumed') resumed,
      bool_or(event_name in ('contact_view','contact_click')) contact_interest,
      bool_or(event_name='contact_view') contact_view,
      bool_or(event_name='contact_click') contact_click
    from eligible group by session_id
  ), totals as (
    select
      (select count(*) from sessions)::int session_count,
      (select count(*) from sessions where outbound)::int outbound_sessions,
      (select count(*) from eligible where event_name='outbound_click')::int outbound_clicks,
      (select count(*) from eligible where event_name='tracking_entry')::int tracking_entries,
      (select count(*) from eligible where event_name='page_view')::int page_views,
      (select count(distinct visitor_id) from eligible where visitor_id is not null)::int visitors,
      (select count(distinct e.visitor_id) from eligible e join public.analytics_visitors v on v.visitor_id=e.visitor_id, bounds b where v.first_seen_at >= b.from_ts and v.first_seen_at < b.to_ts)::int new_visitors,
      (select count(distinct e.visitor_id) from eligible e join public.analytics_visitors v on v.visitor_id=e.visitor_id, bounds b where v.first_seen_at < b.from_ts)::int returning_visitors,
      (select count(*) from sessions where destinations >= 2)::int multi_destination_sessions,
      (select count(*) from sessions where resumed)::int return_sessions,
      (select count(*) from sessions where contact_interest)::int contact_sessions,
      (select count(*) from sessions where contact_click)::int contact_click_sessions,
      (select count(*) from sessions where contact_view)::int contact_view_sessions
  )
  select jsonb_build_object(
    'pageViews', page_views,
    'trackingEntries', tracking_entries,
    'sessions', session_count,
    'visitors', visitors,
    'newVisitors', new_visitors,
    'returningVisitors', returning_visitors,
    'returningVisitorRate', case when visitors > 0 then round(returning_visitors::numeric / visitors * 100,2) else 0 end,
    'outboundSessions', outbound_sessions,
    'outboundSessionRate', case when session_count > 0 then round(outbound_sessions::numeric / session_count * 100,2) else 0 end,
    'outboundClicks', outbound_clicks,
    'clicksPerOutboundSession', case when outbound_sessions > 0 then round(outbound_clicks::numeric / outbound_sessions,2) else 0 end,
    'multiDestinationSessions', multi_destination_sessions,
    'multiDestinationSessionRate', case when outbound_sessions > 0 then round(multi_destination_sessions::numeric / outbound_sessions * 100,2) else 0 end,
    'returnToHubSessions', return_sessions,
    'returnToHubRate', case when outbound_sessions > 0 then round(return_sessions::numeric / outbound_sessions * 100,2) else 0 end,
    'contactInterestSessions', contact_sessions,
    'contactInterestRate', case when session_count > 0 then round(contact_sessions::numeric / session_count * 100,2) else 0 end,
    'contactClickRate', case when contact_view_sessions > 0 then round(contact_click_sessions::numeric / contact_view_sessions * 100,2) else 0 end,
    'topSources', coalesce((select jsonb_agg(jsonb_build_object('label',label,'value',value) order by value desc) from (
      select coalesce(attributed_context->>'source','direct') label, count(distinct session_id)::int value from eligible group by 1 order by 2 desc limit 8
    ) x),'[]'::jsonb),
    'topCampaigns', coalesce((select jsonb_agg(jsonb_build_object('label',label,'value',value) order by value desc) from (
      select coalesce(dimension_snapshots->>'campaignLabel',attributed_context->>'campaign','Bez kampanii') label, count(distinct session_id)::int value from eligible group by 1 order by 2 desc limit 8
    ) x),'[]'::jsonb),
    'topAssets', coalesce((select jsonb_agg(jsonb_build_object('label',label,'value',value) order by value desc) from (
      select dimension_snapshots->>'assetLabel' label, count(distinct session_id)::int value from eligible where nullif(dimension_snapshots->>'assetLabel','') is not null group by 1 order by 2 desc limit 8
    ) x),'[]'::jsonb),
    'topPlacements', coalesce((select jsonb_agg(jsonb_build_object('label',label,'value',value) order by value desc) from (
      select dimension_snapshots->>'placementLabel' label, count(distinct session_id)::int value from eligible where nullif(dimension_snapshots->>'placementLabel','') is not null group by 1 order by 2 desc limit 8
    ) x),'[]'::jsonb),
    'topDestinations', coalesce((select jsonb_agg(jsonb_build_object('label',label,'value',value) order by value desc) from (
      select coalesce(dimension_snapshots->>'destinationLabel',destination_slug,'unknown') label, count(*)::int value from eligible where event_name='outbound_click' group by 1 order by 2 desc limit 8
    ) x),'[]'::jsonb),
    'topTrackingLinks', coalesce((select jsonb_agg(jsonb_build_object('label',label,'value',value) order by value desc) from (
      select coalesce(dimension_snapshots->>'trackingLinkLabel','unattributed') label, count(distinct session_id)::int value from eligible where event_name='tracking_entry' group by 1 order by 2 desc limit 8
    ) x),'[]'::jsonb),
    'timeSeries', coalesce((select jsonb_agg(jsonb_build_object('date',metric_day::text,'sessions',session_count,'outboundSessions',outbound_count) order by metric_day) from (
      select (occurred_at at time zone 'Europe/Warsaw')::date metric_day,
        count(distinct session_id)::int session_count,
        count(distinct session_id) filter (where event_name='outbound_click')::int outbound_count
      from eligible group by 1 order by 1
    ) x),'[]'::jsonb),
    'trafficBreakdown', coalesce((select jsonb_agg(jsonb_build_object('label',traffic_class,'value',value) order by value desc) from (
      select e.traffic_class, count(distinct e.session_id)::int value from public.analytics_events_v2 e, bounds b
      where e.occurred_at >= b.from_ts and e.occurred_at < b.to_ts and e.environment='production' group by e.traffic_class
    ) x),'[]'::jsonb)
  ) from totals;
$$;

revoke all on table public.analytics_assets, public.analytics_placements, public.analytics_visitors,
  public.analytics_sessions_v2, public.analytics_events_v2, public.analytics_quality_daily
from public, anon, authenticated, service_role;
grant select, insert, update on table public.analytics_assets, public.analytics_placements,
  public.analytics_visitors, public.analytics_sessions_v2, public.analytics_quality_daily to service_role;
grant select, insert on table public.analytics_events_v2 to service_role;
grant usage, select on sequence public.analytics_events_v2_id_seq to service_role;

revoke update, delete, truncate on table public.analytics_events, public.analytics_events_v2 from service_role;
grant select, insert on table public.analytics_events, public.analytics_events_v2 to service_role;

-- Audit history is append-only for normal application behavior.
revoke update, delete, truncate on table public.audit_log from service_role;
grant select, insert on table public.audit_log to service_role;

revoke all on function public.analytics_ingest_event_v1(uuid,text,uuid,uuid,text,text,boolean,boolean,text,jsonb,jsonb,jsonb,uuid,uuid,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.analytics_ingest_event_v1(uuid,text,uuid,uuid,text,text,boolean,boolean,text,jsonb,jsonb,jsonb,uuid,uuid,text,text,text,text,jsonb) to service_role;
revoke all on function public.analytics_dashboard_v2(date,date) from public, anon, authenticated;
grant execute on function public.analytics_dashboard_v2(date,date) to service_role;

-- The legacy page-view denominator dashboard is intentionally no longer callable.
drop function if exists public.analytics_dashboard_range(date, date);
drop function if exists public.analytics_dashboard(timestamptz);
