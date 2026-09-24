-- Identity-free public measurement. This table has no visitor, session or acquisition columns,
-- foreign keys, or triggers. The service-role-only RPC is its sole application write contract.
create table public.analytics_cookieless_events (
  event_id uuid primary key,
  project_key text not null check (project_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  event_name text not null check (event_name in ('page_view','contact_view','contact_click','tracking_entry','outbound_click')),
  occurred_at timestamptz not null default now(),
  environment text not null check (environment in ('production','staging','preview','development')),
  traffic_class text not null check (traffic_class in ('external','internal','test','bot')),
  path text not null check (public.analytics_valid_event_path_v1(path)),
  referrer_host text check (referrer_host ~ '^[a-z0-9.-]{1,253}$'),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  tracking_link_id uuid references public.tracking_links(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  asset_id uuid references public.analytics_assets(id) on delete set null,
  placement_id uuid references public.analytics_placements(id) on delete set null,
  destination_id uuid references public.destinations(id) on delete set null,
  destination_slug text,
  check (
    (event_name in ('page_view','contact_view','contact_click') and tracking_link_id is null and destination_id is null and destination_slug is null)
    or (event_name = 'tracking_entry' and tracking_link_id is not null and destination_id is null and destination_slug is null)
    or (event_name = 'outbound_click' and tracking_link_id is null and destination_id is not null and destination_slug is not null)
  ),
  check (event_name <> 'page_view' or path in ('/','/karaoke-trojmiasto','/dla-lokali','/kontakt','/linki','/prywatnosc','/cookies')),
  check (event_name not in ('contact_view','contact_click') or path = '/kontakt'),
  check (event_name <> 'tracking_entry' or path ~ '^/r/[A-Z2-9]{5,7}$'),
  check (event_name <> 'outbound_click' or path = '/go/' || destination_slug),
  check (utm_source is null or length(utm_source) <= 64),
  check (utm_medium is null or length(utm_medium) <= 64),
  check (utm_campaign is null or length(utm_campaign) <= 96),
  check (utm_content is null or length(utm_content) <= 96),
  check (utm_term is null or length(utm_term) <= 96)
);

create index analytics_cookieless_events_reporting_idx on public.analytics_cookieless_events (project_key, environment, occurred_at desc);
alter table public.analytics_cookieless_events enable row level security;
revoke all on public.analytics_cookieless_events from public, anon, authenticated;

create function public.analytics_ingest_cookieless_v1(
  p_event_id uuid, p_project_key text, p_event_name text, p_environment text,
  p_traffic_class text, p_path text, p_referrer_host text,
  p_utm_source text, p_utm_medium text, p_utm_campaign text,
  p_utm_content text, p_utm_term text, p_tracking_link_id uuid,
  p_campaign_id uuid, p_asset_id uuid, p_placement_id uuid,
  p_destination_id uuid, p_destination_slug text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Table constraints remain authoritative for every caller, including service role.
  insert into public.analytics_cookieless_events (
    event_id, project_key, event_name, environment, traffic_class, path,
    referrer_host, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    tracking_link_id, campaign_id, asset_id, placement_id, destination_id, destination_slug
  ) values (
    p_event_id, p_project_key, p_event_name, p_environment, p_traffic_class, p_path,
    p_referrer_host, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_tracking_link_id, p_campaign_id, p_asset_id, p_placement_id, p_destination_id, p_destination_slug
  ) on conflict (event_id) do nothing;
  return found;
end;
$$;

revoke all on function public.analytics_ingest_cookieless_v1(uuid,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.analytics_ingest_cookieless_v1(uuid,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,text) to service_role;
