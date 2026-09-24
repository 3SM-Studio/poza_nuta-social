-- Minimal, append-only evidence of affirmative analytics consent and withdrawal.
-- No IP, user-agent, referrer, or denied-visitor identifier is stored.
create table public.analytics_consent_evidence (
  id uuid primary key,
  visitor_id uuid not null,
  analytics_enabled boolean not null,
  consent_version smallint not null,
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '180 days')
);

create index analytics_consent_evidence_visitor_time_idx
  on public.analytics_consent_evidence (visitor_id, occurred_at desc);
create index analytics_consent_evidence_expiry_idx
  on public.analytics_consent_evidence (expires_at);

alter table public.analytics_consent_evidence enable row level security;
revoke all on public.analytics_consent_evidence from anon, authenticated;
grant select, insert on public.analytics_consent_evidence to service_role;
revoke update, delete, truncate on public.analytics_consent_evidence from service_role;
