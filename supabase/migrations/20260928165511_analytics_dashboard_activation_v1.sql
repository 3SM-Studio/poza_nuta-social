-- Decision summary over the existing acquisition and tracking-entry models.
-- Channel rows are mutually exclusive consented sessions. Offline rows are
-- accepted /r entry events (including cookieless); they are not QR scans.
-- The existing pure SQL reporting predicate is service-role only, but give it
-- a fixed search path so every RPC using it has an explicit resolution scope.
alter function public.analytics_reporting_eligible_v1(text,text,text) set search_path = public;

create function public.analytics_dashboard_activation_v1(
  p_project_key text, p_from_date date, p_to_date_exclusive date
) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare result jsonb;
begin
  if p_project_key is null or p_project_key !~ '^[a-z][a-z0-9_]{1,63}$'
    or p_from_date is null or p_to_date_exclusive is null
    or p_to_date_exclusive <= p_from_date or p_to_date_exclusive > p_from_date + 366 then
    raise exception 'invalid_dashboard_activation_range';
  end if;

  with session_ids as (
    select distinct e.session_id
    from public.analytics_events_v2 e
    where e.analytics_consent = true
      and public.analytics_reporting_eligible_v1('business',e.environment,e.traffic_class)
      and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
      and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
  ), channels as (
    select coalesce(nullif(s.session_acquisition->>'channelGroup',''),'other') channel_group,
      count(*)::bigint sessions
    from session_ids e join public.analytics_sessions_v2 s on s.session_id = e.session_id
    group by 1
  ), entry_links as (
    select e.tracking_link_id
    from public.analytics_cookieless_events e
    where e.project_key = p_project_key and e.event_name = 'tracking_entry'
      and public.analytics_reporting_eligible_v1('business',e.environment,e.traffic_class)
      and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
      and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
    union all
    select e.tracking_link_id
    from public.analytics_events_v2 e
    where e.event_name = 'tracking_entry' and e.analytics_consent = true
      and public.analytics_reporting_eligible_v1('business',e.environment,e.traffic_class)
      and e.occurred_at >= p_from_date::timestamp at time zone 'Europe/Warsaw'
      and e.occurred_at < p_to_date_exclusive::timestamp at time zone 'Europe/Warsaw'
  ), entries as (
    select e.tracking_link_id, l.code, l.distribution_unit,
      l.referral_participant_id, r.display_name participant_name
    from entry_links e
    left join public.tracking_links l on l.id = e.tracking_link_id
    left join public.referral_participants r on r.id = l.referral_participant_id
  )
  select jsonb_build_object(
    'fromDate',p_from_date,'toDateExclusive',p_to_date_exclusive,'scope','business',
    'consentedSessions',(select count(*) from session_ids),
    'trackingEntryEvents',(select count(*) from entries),
    'channels',coalesce((select jsonb_agg(jsonb_build_object(
      'key',channel_group,'sessions',sessions) order by sessions desc,channel_group)
      from channels),'[]'::jsonb),
    'distributionUnits',coalesce((select jsonb_agg(jsonb_build_object(
      'label',label,'entries',entries) order by entries desc,label)
      from (select distribution_unit || ' · ' || code label,count(*)::bigint entries
        from entries where distribution_unit is not null and code is not null
        group by tracking_link_id,distribution_unit,code order by entries desc,label limit 8) ranked),'[]'::jsonb),
    'referralParticipants',coalesce((select jsonb_agg(jsonb_build_object(
      'label',label,'entries',entries) order by entries desc,label)
      from (select coalesce(nullif(participant_name,''),'Nieaktywny uczestnik polecający') label,
        count(*)::bigint entries
        from entries where referral_participant_id is not null
        group by referral_participant_id,participant_name order by entries desc,label limit 8) ranked),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.analytics_dashboard_activation_v1(text,date,date) from public, anon, authenticated;
grant execute on function public.analytics_dashboard_activation_v1(text,date,date) to service_role;
