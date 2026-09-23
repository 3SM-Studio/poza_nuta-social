create extension if not exists pgcrypto;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('draft','active','archived')),
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  url text not null,
  icon text not null default 'external-link',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5,7}$'),
  campaign_id uuid references public.campaigns(id) on delete set null,
  label text not null,
  source text not null default 'qr',
  medium text not null default 'offline',
  asset text,
  placement text,
  landing_path text not null default '/',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_key uuid not null unique,
  event_type text not null check (event_type in ('entry','page_view','outbound_click','interaction')),
  visit_id uuid not null,
  path text not null,
  referrer_host text,
  source text not null default 'direct',
  medium text,
  campaign_id uuid references public.campaigns(id) on delete set null,
  tracking_link_id uuid references public.tracking_links(id) on delete set null,
  destination_id uuid references public.destinations(id) on delete set null,
  destination_slug text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tracking_links_campaign_id_idx on public.tracking_links (campaign_id);
create index if not exists analytics_events_campaign_id_idx on public.analytics_events (campaign_id, created_at desc);
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_visit_id_idx on public.analytics_events (visit_id);
create index if not exists analytics_events_source_idx on public.analytics_events (source, created_at desc);
create index if not exists analytics_events_tracking_link_idx on public.analytics_events (tracking_link_id, created_at desc);
create index if not exists analytics_events_destination_idx on public.analytics_events (destination_id, created_at desc);

alter table public.campaigns enable row level security;
alter table public.destinations enable row level security;
alter table public.tracking_links enable row level security;
alter table public.analytics_events enable row level security;

-- No public table policies are intentionally created. The application reads/writes
-- business and analytics data only through server code using the service role.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists campaigns_touch_updated_at on public.campaigns;
create trigger campaigns_touch_updated_at before update on public.campaigns
for each row execute function public.touch_updated_at();

drop trigger if exists destinations_touch_updated_at on public.destinations;
create trigger destinations_touch_updated_at before update on public.destinations
for each row execute function public.touch_updated_at();

drop trigger if exists tracking_links_touch_updated_at on public.tracking_links;
create trigger tracking_links_touch_updated_at before update on public.tracking_links
for each row execute function public.touch_updated_at();

create or replace function public.analytics_dashboard(p_since timestamptz)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'pageViews', (select count(*) from analytics_events where created_at >= p_since and event_type = 'page_view'),
    'entries', (select count(*) from analytics_events where created_at >= p_since and event_type = 'entry'),
    'outboundClicks', (select count(*) from analytics_events where created_at >= p_since and event_type = 'outbound_click'),
    'uniqueSessions', (select count(distinct visit_id) from analytics_events where created_at >= p_since),
    'topSources', coalesce((
      select jsonb_agg(jsonb_build_object('label', source, 'value', value) order by value desc)
      from (
        select source, count(*)::int as value
        from analytics_events
        where created_at >= p_since and event_type = 'page_view'
        group by source
        order by value desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'topDestinations', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select coalesce(d.label, e.destination_slug, 'unknown') as label, count(*)::int as value
        from analytics_events e
        left join destinations d on d.id = e.destination_id
        where e.created_at >= p_since and e.event_type = 'outbound_click'
        group by coalesce(d.label, e.destination_slug, 'unknown')
        order by value desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'topTrackingLinks', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select coalesce(t.label, 'unattributed') as label, count(*)::int as value
        from analytics_events e
        left join tracking_links t on t.id = e.tracking_link_id
        where e.created_at >= p_since and e.event_type = 'entry'
        group by coalesce(t.label, 'unattributed')
        order by value desc
        limit 8
      ) x
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.analytics_dashboard(timestamptz) from public;
grant execute on function public.analytics_dashboard(timestamptz) to service_role;
