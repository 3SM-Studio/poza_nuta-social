begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('e1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-v21@pozanuta.test','',now(),'{}','{}',now(),now()),
  ('e1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer-v21@pozanuta.test','',now(),'{}','{}',now(),now());
insert into public.admin_profiles (user_id, role) values
  ('e1000000-0000-4000-8000-000000000001','owner'),
  ('e1000000-0000-4000-8000-000000000002','viewer');

create function pg_temp.force_selected_audit_failure()
returns trigger
language plpgsql
as $$
begin
  if new.action = 'campaign.create' and new.new_value->>'slug' = 'forced-audit-failure' then
    raise exception 'forced_audit_failure';
  end if;
  return new;
end;
$$;
create trigger force_selected_audit_failure
before insert on public.audit_log
for each row execute function pg_temp.force_selected_audit_failure();

select is((
  select count(*)::int
  from pg_proc
  where oid in (
    'public.admin_campaign_create_v1(uuid,text,text,text,date,date)'::regprocedure,
    'public.admin_campaign_archive_v1(uuid,text,uuid)'::regprocedure,
    'public.admin_destination_upsert_v1(uuid,text,text,text,text,text,text,integer)'::regprocedure,
    'public.admin_destination_toggle_v1(uuid,text,uuid)'::regprocedure,
    'public.admin_tracking_link_create_v1(uuid,text,text,text,uuid,text,text,text,text,text,text,text,text)'::regprocedure,
    'public.admin_tracking_link_toggle_v1(uuid,text,uuid)'::regprocedure
  ) and not prosecdef
),6,'all audited mutation RPCs are security invoker');
select ok(not has_function_privilege('anon','public.admin_campaign_create_v1(uuid,text,text,text,date,date)','execute'),'anon cannot invoke audited mutations');
select ok(not has_function_privilege('authenticated','public.admin_campaign_create_v1(uuid,text,text,text,date,date)','execute'),'authenticated users cannot invoke service mutation RPCs directly');
select ok(has_function_privilege('service_role','public.admin_campaign_create_v1(uuid,text,text,text,date,date)','execute'),'service role can invoke audited mutations');

set local role service_role;

select public.admin_campaign_create_v1('e1000000-0000-4000-8000-000000000001','owner-v21@pozanuta.test','Atomic campaign','atomic-campaign-v21',null,null);
select is((select count(*)::int from public.campaigns where slug='atomic-campaign-v21'),1,'successful campaign mutation commits once');
select is((select count(*)::int from public.audit_log where action='campaign.create' and new_value->>'slug'='atomic-campaign-v21'),1,'successful campaign mutation has exactly one audit row');

select throws_ok(
  $$select public.admin_campaign_create_v1('e1000000-0000-4000-8000-000000000001','owner-v21@pozanuta.test','Duplicate campaign','atomic-campaign-v21',null,null)$$,
  '23505',
  'duplicate key value violates unique constraint "campaigns_slug_key"',
  'failed business mutation raises instead of writing a success audit'
);
select is((select count(*)::int from public.audit_log where action='campaign.create' and new_value->>'slug'='atomic-campaign-v21'),1,'failed business mutation adds no fake audit row');

select throws_ok(
  $$select public.admin_campaign_archive_v1('e1000000-0000-4000-8000-000000000001','owner-v21@pozanuta.test','e9000000-0000-4000-8000-000000000099')$$,
  'P0002',
  'campaign_not_found',
  'zero-row archive fails explicitly'
);
select is((select count(*)::int from public.audit_log where entity_id='e9000000-0000-4000-8000-000000000099'),0,'zero-row mutation produces no audit row');

select throws_ok(
  $$select public.admin_campaign_create_v1('e1000000-0000-4000-8000-000000000001','owner-v21@pozanuta.test','Forced audit failure','forced-audit-failure',null,null)$$,
  'P0001',
  'forced_audit_failure',
  'forced audit failure aborts the RPC'
);
select is((select count(*)::int from public.campaigns where slug='forced-audit-failure'),0,'forced audit failure rolls back the business mutation');

select throws_ok(
  $$select public.admin_campaign_create_v1('e1000000-0000-4000-8000-000000000002','viewer-v21@pozanuta.test','Viewer campaign','viewer-campaign-v21',null,null)$$,
  '42501',
  'admin_editor_required',
  'viewer is denied by the database mutation boundary'
);
select is((select count(*)::int from public.campaigns where slug='viewer-campaign-v21'),0,'viewer denial leaves no business row');

select public.admin_destination_upsert_v1('e1000000-0000-4000-8000-000000000001','owner-v21@pozanuta.test','Instagram V2.1','instagram','https://www.instagram.com/poza.nuta/','instagram',null,10);
select is((select count(*)::int from public.audit_log where action in ('destination.create','destination.update') and new_value->>'label'='Instagram V2.1'),1,'destination upsert and audit commit atomically');

select public.admin_tracking_link_create_v1('e1000000-0000-4000-8000-000000000001','owner-v21@pozanuta.test','V2QRS','Atomic link',null,'offline','poster','qr','Pink V2','pink-v2','Entrance','entrance','/');
select is((select count(*)::int from public.audit_log where action='tracking_link.create' and new_value->>'code'='V2QRS'),1,'asset, placement, tracking link and audit commit in one RPC');

select throws_ok(
  $$update public.destinations set url='http://www.instagram.com/poza.nuta/' where slug='instagram'$$,
  '23514',
  null,
  'database rejects non-HTTPS official destinations'
);

select * from finish();
rollback;
