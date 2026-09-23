-- Product decisions 33-46, 72-82: anonymous session attribution, broad device data,
-- role semantics, auditability, and the approved analytics dashboard dimensions.

create table if not exists public.analytics_sessions (
  visit_id uuid primary key,
  first_source text not null default 'direct',
  first_medium text,
  first_campaign_id uuid references public.campaigns(id) on delete set null,
  first_tracking_link_id uuid references public.tracking_links(id) on delete set null,
  first_referrer_host text,
  last_source text not null default 'direct',
  last_medium text,
  last_campaign_id uuid references public.campaigns(id) on delete set null,
  last_tracking_link_id uuid references public.tracking_links(id) on delete set null,
  last_referrer_host text,
  device_type text check (device_type in ('mobile','tablet','desktop')),
  browser_family text,
  os_family text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.analytics_events add column if not exists device_type text;
alter table public.analytics_events add column if not exists browser_family text;
alter table public.analytics_events add column if not exists os_family text;

create index if not exists analytics_sessions_last_seen_idx on public.analytics_sessions (last_seen_at desc);
create index if not exists analytics_sessions_first_campaign_idx on public.analytics_sessions (first_campaign_id);
create index if not exists analytics_sessions_last_campaign_idx on public.analytics_sessions (last_campaign_id);
create index if not exists analytics_sessions_first_tracking_idx on public.analytics_sessions (first_tracking_link_id);
create index if not exists analytics_sessions_last_tracking_idx on public.analytics_sessions (last_tracking_link_id);

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','admin','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);

alter table public.analytics_sessions enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.audit_log enable row level security;

-- Server-only access. No public policies by design; service_role bypasses RLS.

drop trigger if exists admin_profiles_touch_updated_at on public.admin_profiles;
create trigger admin_profiles_touch_updated_at before update on public.admin_profiles
for each row execute function public.touch_updated_at();

create or replace function public.analytics_dashboard(p_since timestamptz)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with totals as (
    select
      count(*) filter (where event_type = 'page_view')::int as page_views,
      count(*) filter (where event_type = 'entry')::int as entries,
      count(*) filter (where event_type = 'outbound_click')::int as outbound_clicks,
      count(distinct visit_id)::int as unique_sessions
    from analytics_events where created_at >= p_since
  )
  select jsonb_build_object(
    'pageViews', page_views,
    'entries', entries,
    'outboundClicks', outbound_clicks,
    'uniqueSessions', unique_sessions,
    'outboundCtr', case when page_views > 0 then round((outbound_clicks::numeric / page_views::numeric) * 100, 2) else 0 end,
    'topSources', coalesce((
      select jsonb_agg(jsonb_build_object('label', source, 'value', value) order by value desc)
      from (select source, count(*)::int value from analytics_events where created_at >= p_since and event_type = 'page_view' group by source order by value desc limit 8) x
    ), '[]'::jsonb),
    'topCampaigns', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select coalesce(c.name, 'Bez kampanii') label, count(*)::int value
        from analytics_events e left join campaigns c on c.id = e.campaign_id
        where e.created_at >= p_since and e.event_type in ('entry','page_view')
        group by coalesce(c.name, 'Bez kampanii') order by value desc limit 8
      ) x
    ), '[]'::jsonb),
    'topDestinations', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select coalesce(d.label, e.destination_slug, 'unknown') label, count(*)::int value
        from analytics_events e left join destinations d on d.id = e.destination_id
        where e.created_at >= p_since and e.event_type = 'outbound_click'
        group by coalesce(d.label, e.destination_slug, 'unknown') order by value desc limit 8
      ) x
    ), '[]'::jsonb),
    'topTrackingLinks', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select coalesce(t.label, 'unattributed') label, count(*)::int value
        from analytics_events e left join tracking_links t on t.id = e.tracking_link_id
        where e.created_at >= p_since and e.event_type = 'entry'
        group by coalesce(t.label, 'unattributed') order by value desc limit 8
      ) x
    ), '[]'::jsonb),
    'timeSeries', coalesce((
      select jsonb_agg(jsonb_build_object('date', metric_day::text, 'visits', visits, 'clicks', clicks) order by metric_day)
      from (
        select created_at::date as metric_day,
          count(distinct visit_id) filter (where event_type='page_view')::int visits,
          count(*) filter (where event_type='outbound_click')::int clicks
        from analytics_events where created_at >= p_since group by created_at::date order by created_at::date
      ) x
    ), '[]'::jsonb)
  )
  from totals;
$$;

revoke all on function public.analytics_dashboard(timestamptz) from public;
grant execute on function public.analytics_dashboard(timestamptz) to service_role;
