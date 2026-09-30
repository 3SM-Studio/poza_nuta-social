-- Keep historical /privacy events intact while making /prywatnosc the only
-- canonical privacy path accepted for new ingestion.
create or replace function public.analytics_valid_event_path_v1(p_path text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_path in ('/','/karaoke-trojmiasto','/dla-lokali','/kontakt','/linki','/prywatnosc','/cookies')
    or p_path ~ '^/(r|go)/[A-Za-z0-9_-]{1,80}$';
$$;

alter table public.analytics_events_v2 drop constraint analytics_events_v2_path_check;

do $$
declare
  v_legacy_max_id bigint := coalesce((select max(id) from public.analytics_events_v2), 0);
begin
  -- Identity values already present at migration time retain their path.
  -- New inserts receive higher identities even if their timestamps are backdated.
  execute format(
    'alter table public.analytics_events_v2 add constraint analytics_events_v2_path_check check (public.analytics_valid_event_path_v1(path) or (path = %L and id <= %s)) not valid',
    '/privacy', v_legacy_max_id
  );
end;
$$;

alter table public.analytics_events_v2 validate constraint analytics_events_v2_path_check;
