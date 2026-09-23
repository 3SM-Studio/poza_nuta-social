-- Preserve textual UTM campaign attribution at the session level, enforce
-- same-origin tracking landings, and make Data API access explicit for the
-- server-only service role.

alter table public.analytics_sessions
  add column if not exists first_campaign text,
  add column if not exists last_campaign text,
  add column if not exists first_content text,
  add column if not exists last_content text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tracking_links_landing_path_internal'
      and conrelid = 'public.tracking_links'::regclass
  ) then
    alter table public.tracking_links
      add constraint tracking_links_landing_path_internal
      check (
        left(landing_path, 1) = '/'
        and left(landing_path, 2) <> '//'
        and position(E'\\' in landing_path) = 0
      ) not valid;
  end if;
end $$;

alter table public.tracking_links
  validate constraint tracking_links_landing_path_internal;

create index if not exists analytics_events_type_created_idx
  on public.analytics_events (event_type, created_at desc);

revoke all on table
  public.campaigns,
  public.destinations,
  public.tracking_links,
  public.analytics_sessions,
  public.analytics_events,
  public.admin_profiles,
  public.audit_log
from anon, authenticated, service_role;

grant usage on schema public to service_role;
grant select, insert, update on table
  public.campaigns,
  public.destinations,
  public.tracking_links,
  public.analytics_sessions,
  public.analytics_events,
  public.admin_profiles,
  public.audit_log
to service_role;
grant usage, select on sequence public.analytics_events_id_seq to service_role;
grant usage, select on sequence public.audit_log_id_seq to service_role;

-- The legacy range-less RPC is no longer called by the application. Removing it
-- eliminates its older SECURITY DEFINER execution path before the ranged RPC is
-- recreated below as SECURITY INVOKER.
drop function if exists public.analytics_dashboard(timestamptz);

create or replace function public.analytics_dashboard_range(
  p_from_date date,
  p_to_date_exclusive date
)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  with bounds as (
    select
      (p_from_date::timestamp at time zone 'Europe/Warsaw') as from_ts,
      (p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw') as to_ts
  ),
  totals as (
    select
      count(*) filter (where e.event_type = 'page_view')::int as page_views,
      count(*) filter (where e.event_type = 'entry')::int as entries,
      count(*) filter (where e.event_type = 'outbound_click')::int as outbound_clicks,
      count(distinct e.visit_id)::int as unique_sessions
    from public.analytics_events e, bounds b
    where e.created_at >= b.from_ts and e.created_at < b.to_ts
  )
  select jsonb_build_object(
    'pageViews', page_views,
    'entries', entries,
    'outboundClicks', outbound_clicks,
    'uniqueSessions', unique_sessions,
    'outboundCtr', case when page_views > 0 then round((outbound_clicks::numeric / page_views::numeric) * 100, 2) else 0 end,
    'topSources', coalesce((
      select jsonb_agg(jsonb_build_object('label', source, 'value', value) order by value desc)
      from (
        select e.source, count(*)::int value
        from public.analytics_events e, bounds b
        where e.created_at >= b.from_ts and e.created_at < b.to_ts and e.event_type = 'page_view'
        group by e.source order by value desc limit 8
      ) x
    ), '[]'::jsonb),
    'topCampaigns', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select coalesce(c.name, nullif(e.utm_campaign, ''), 'Bez kampanii') label, count(*)::int value
        from public.analytics_events e
        cross join bounds b
        left join public.campaigns c on c.id = e.campaign_id
        where e.created_at >= b.from_ts and e.created_at < b.to_ts and e.event_type in ('entry','page_view')
        group by coalesce(c.name, nullif(e.utm_campaign, ''), 'Bez kampanii') order by value desc limit 8
      ) x
    ), '[]'::jsonb),
    'topDestinations', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select coalesce(d.label, e.destination_slug, 'unknown') label, count(*)::int value
        from public.analytics_events e
        cross join bounds b
        left join public.destinations d on d.id = e.destination_id
        where e.created_at >= b.from_ts and e.created_at < b.to_ts and e.event_type = 'outbound_click'
        group by coalesce(d.label, e.destination_slug, 'unknown') order by value desc limit 8
      ) x
    ), '[]'::jsonb),
    'topTrackingLinks', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select coalesce(t.label, 'unattributed') label, count(*)::int value
        from public.analytics_events e
        cross join bounds b
        left join public.tracking_links t on t.id = e.tracking_link_id
        where e.created_at >= b.from_ts and e.created_at < b.to_ts and e.event_type = 'entry'
        group by coalesce(t.label, 'unattributed') order by value desc limit 8
      ) x
    ), '[]'::jsonb),
    'timeSeries', coalesce((
      select jsonb_agg(jsonb_build_object('date', metric_day::text, 'visits', visits, 'clicks', clicks) order by metric_day)
      from (
        select (e.created_at at time zone 'Europe/Warsaw')::date as metric_day,
          count(distinct e.visit_id) filter (where e.event_type='page_view')::int visits,
          count(*) filter (where e.event_type='outbound_click')::int clicks
        from public.analytics_events e, bounds b
        where e.created_at >= b.from_ts and e.created_at < b.to_ts
        group by (e.created_at at time zone 'Europe/Warsaw')::date
        order by metric_day
      ) x
    ), '[]'::jsonb)
  )
  from totals;
$$;

revoke all on function public.analytics_dashboard_range(date, date) from public, anon, authenticated;
grant execute on function public.analytics_dashboard_range(date, date) to service_role;
