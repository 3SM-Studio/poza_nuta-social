-- Product decisions 80-82: 30-day default, today/7/30/90/custom ranges,
-- and comparison with the immediately preceding period.

create or replace function public.analytics_dashboard_range(
  p_from_date date,
  p_to_date_exclusive date
)
returns jsonb
language sql
security definer
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
    from analytics_events e, bounds b
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
        from analytics_events e, bounds b
        where e.created_at >= b.from_ts and e.created_at < b.to_ts and e.event_type = 'page_view'
        group by e.source order by value desc limit 8
      ) x
    ), '[]'::jsonb),
    'topCampaigns', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select coalesce(c.name, 'Bez kampanii') label, count(*)::int value
        from analytics_events e
        cross join bounds b
        left join campaigns c on c.id = e.campaign_id
        where e.created_at >= b.from_ts and e.created_at < b.to_ts and e.event_type in ('entry','page_view')
        group by coalesce(c.name, 'Bez kampanii') order by value desc limit 8
      ) x
    ), '[]'::jsonb),
    'topDestinations', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select coalesce(d.label, e.destination_slug, 'unknown') label, count(*)::int value
        from analytics_events e
        cross join bounds b
        left join destinations d on d.id = e.destination_id
        where e.created_at >= b.from_ts and e.created_at < b.to_ts and e.event_type = 'outbound_click'
        group by coalesce(d.label, e.destination_slug, 'unknown') order by value desc limit 8
      ) x
    ), '[]'::jsonb),
    'topTrackingLinks', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by value desc)
      from (
        select coalesce(t.label, 'unattributed') label, count(*)::int value
        from analytics_events e
        cross join bounds b
        left join tracking_links t on t.id = e.tracking_link_id
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
        from analytics_events e, bounds b
        where e.created_at >= b.from_ts and e.created_at < b.to_ts
        group by (e.created_at at time zone 'Europe/Warsaw')::date
        order by metric_day
      ) x
    ), '[]'::jsonb)
  )
  from totals;
$$;

revoke all on function public.analytics_dashboard_range(date, date) from public;
grant execute on function public.analytics_dashboard_range(date, date) to service_role;
