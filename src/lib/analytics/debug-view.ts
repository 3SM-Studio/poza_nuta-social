import "server-only";

import { ANALYTICS_PROJECT_KEY } from "@/lib/analytics-project";
import { EVENT_NAMES, normalizedHost, sanitizeTaxonomyValue, TRAFFIC_CLASSES, type AnalyticsEventName } from "@/lib/analytics-taxonomy";
import { isPublicPath } from "@/lib/public-paths";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUALITY_SURFACES, type QualityOutcome, type QualityReason, type QualitySurface } from "./data-quality";

export type DebugOutcome = "accepted" | QualityOutcome;
export type DebugMode = "cookieless" | "consented" | "unknown";
export type DebugSurface = QualitySurface | "unknown";
export type DebugFilters = {
  minutes: 30 | 120 | 1440;
  eventName: AnalyticsEventName | null;
  outcome: DebugOutcome | null;
  mode: DebugMode | null;
  surface: DebugSurface | null;
};

export type DebugRecord = {
  key: string;
  observedAt: string;
  eventName: AnalyticsEventName | null;
  outcome: DebugOutcome;
  reasonCode: QualityReason | null;
  analyticsMode: DebugMode;
  surface: DebugSurface;
  projectKey: string;
  canonicalPath: string | null;
  eventId: string | null;
  persistence: "cookieless" | "consented" | null;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  trackingLinkId: string | null;
  destinationId: string | null;
  trafficClass: typeof TRAFFIC_CLASSES[number] | null;
};

export const DEBUG_LIMIT = 60;
const allowedOutcomes: DebugOutcome[] = ["accepted", "rejected", "duplicate", "filtered"];
const allowedModes: DebugMode[] = ["cookieless", "consented", "unknown"];

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export function parseDebugFilters(params: Record<string, string | string[] | undefined>): DebugFilters {
  const window = single(params.window);
  const event = single(params.event);
  const outcome = single(params.outcome);
  const mode = single(params.mode);
  const surface = single(params.surface);
  return {
    minutes: window === "120" ? 120 : window === "1440" ? 1440 : 30,
    eventName: EVENT_NAMES.includes(event as AnalyticsEventName) ? event as AnalyticsEventName : null,
    outcome: allowedOutcomes.includes(outcome as DebugOutcome) ? outcome as DebugOutcome : null,
    mode: allowedModes.includes(mode as DebugMode) ? mode as DebugMode : null,
    surface: [...QUALITY_SURFACES, "unknown"].includes(surface as DebugSurface) ? surface as DebugSurface : null,
  };
}

function eventName(value: unknown): AnalyticsEventName | null {
  return EVENT_NAMES.includes(value as AnalyticsEventName) ? value as AnalyticsEventName : null;
}

function canonicalPath(value: unknown) {
  if (isPublicPath(value)) return value;
  if (typeof value !== "string") return null;
  if (/^\/r\/[A-Z2-9]{5,7}$/.test(value)) return value;
  if (/^\/go\/[a-z0-9_-]{1,80}$/.test(value)) return value;
  return null;
}

function safeTaxonomy(value: unknown, limit: number) {
  return typeof value === "string" && sanitizeTaxonomyValue(value, limit) === value ? value : null;
}

function safeHost(value: unknown) {
  return typeof value === "string" && normalizedHost(value, true) === value ? value : null;
}

function safeUuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function acceptedSurface(name: AnalyticsEventName | null): DebugSurface {
  if (name === "tracking_entry") return "tracking_redirect";
  if (name === "outbound_click") return "outbound_redirect";
  if (name && ["page_view", "contact_view", "contact_click", "hub_resumed"].includes(name)) return "api_track";
  return "unknown";
}

function acceptedNames(surface: DebugSurface | null): AnalyticsEventName[] | null {
  if (surface === "tracking_redirect") return ["tracking_entry"];
  if (surface === "outbound_redirect") return ["outbound_click"];
  if (surface === "api_track") return ["page_view", "contact_view", "contact_click", "hub_resumed"];
  return surface === "unknown" ? [] : null;
}

type Row = Record<string, unknown>;

function accepted(row: Row, mode: "cookieless" | "consented"): DebugRecord {
  const name = eventName(row.event_name);
  const context = mode === "consented" && row.observed_context && typeof row.observed_context === "object" && !Array.isArray(row.observed_context)
    ? row.observed_context as Row : {};
  return {
    key: `${mode}:${row.event_id}`,
    observedAt: String(row.occurred_at), eventName: name, outcome: "accepted", reasonCode: null,
    analyticsMode: mode, surface: acceptedSurface(name), projectKey: ANALYTICS_PROJECT_KEY,
    canonicalPath: canonicalPath(row.path), eventId: safeUuid(row.event_id), persistence: mode,
    referrerHost: safeHost(mode === "cookieless" ? row.referrer_host : context.referrerHost),
    utmSource: safeTaxonomy(mode === "cookieless" ? row.utm_source : context.source, 64),
    utmMedium: safeTaxonomy(mode === "cookieless" ? row.utm_medium : context.medium, 64),
    utmCampaign: safeTaxonomy(mode === "cookieless" ? row.utm_campaign : context.campaign, 96),
    utmContent: safeTaxonomy(mode === "cookieless" ? row.utm_content : context.content, 96),
    trackingLinkId: safeUuid(row.tracking_link_id), destinationId: safeUuid(row.destination_id),
    trafficClass: TRAFFIC_CLASSES.includes(row.traffic_class as typeof TRAFFIC_CLASSES[number]) ? row.traffic_class as typeof TRAFFIC_CLASSES[number] : null,
  };
}

function exception(row: Row): DebugRecord {
  return {
    key: `quality:${row.id}`, observedAt: String(row.occurred_at), eventName: eventName(row.event_name),
    outcome: row.outcome as QualityOutcome, reasonCode: row.reason as QualityReason,
    analyticsMode: row.mode === "cookieless" || row.mode === "consented" ? row.mode : "unknown",
    surface: QUALITY_SURFACES.includes(row.surface as QualitySurface) ? row.surface as QualitySurface : "unknown",
    projectKey: ANALYTICS_PROJECT_KEY, canonicalPath: canonicalPath(row.path), eventId: null,
    persistence: null, referrerHost: null, utmSource: null, utmMedium: null, utmCampaign: null,
    utmContent: null, trackingLinkId: null, destinationId: null, trafficClass: null,
  };
}

export async function getDebugRecords(filters: DebugFilters, now = new Date()): Promise<DebugRecord[] | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const from = new Date(now.getTime() - filters.minutes * 60_000).toISOString();
  const to = now.toISOString();
  const surfaceNames = acceptedNames(filters.surface);
  const acceptedNameExcluded = surfaceNames !== null && (surfaceNames.length === 0 || Boolean(filters.eventName && !surfaceNames.includes(filters.eventName)));
  const readCookieless = async () => {
    if (filters.outcome && filters.outcome !== "accepted" || filters.mode && filters.mode !== "cookieless" || acceptedNameExcluded) return [];
    let query = admin.from("analytics_cookieless_events")
      .select("event_id,event_name,occurred_at,path,referrer_host,utm_source,utm_medium,utm_campaign,utm_content,tracking_link_id,destination_id,traffic_class")
      .eq("project_key", ANALYTICS_PROJECT_KEY).gte("occurred_at", from).lt("occurred_at", to).order("occurred_at", { ascending: false }).limit(DEBUG_LIMIT);
    if (filters.eventName) query = query.eq("event_name", filters.eventName);
    else if (surfaceNames) query = query.in("event_name", surfaceNames);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => accepted(row, "cookieless"));
  };
  const readConsented = async () => {
    if (filters.outcome && filters.outcome !== "accepted" || filters.mode && filters.mode !== "consented" || acceptedNameExcluded) return [];
    let query = admin.from("analytics_events_v2")
      .select("event_id,event_name,occurred_at,path,observed_context,tracking_link_id,destination_id,traffic_class")
      .eq("analytics_consent", true).gte("occurred_at", from).lt("occurred_at", to).order("occurred_at", { ascending: false }).limit(DEBUG_LIMIT);
    if (filters.eventName) query = query.eq("event_name", filters.eventName);
    else if (surfaceNames) query = query.in("event_name", surfaceNames);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => accepted(row, "consented"));
  };
  const readExceptions = async () => {
    if (filters.outcome === "accepted") return [];
    let query = admin.from("analytics_quality_exceptions")
      .select("id,event_name,occurred_at,path,outcome,reason,mode,surface")
      .eq("project_key", ANALYTICS_PROJECT_KEY).gte("occurred_at", from).lt("occurred_at", to).order("occurred_at", { ascending: false }).limit(DEBUG_LIMIT);
    if (filters.eventName) query = query.eq("event_name", filters.eventName);
    if (filters.outcome) query = query.eq("outcome", filters.outcome);
    if (filters.mode) query = filters.mode === "unknown" ? query.is("mode", null) : query.eq("mode", filters.mode);
    if (filters.surface) query = filters.surface === "unknown" ? query.is("surface", null) : query.eq("surface", filters.surface);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(exception);
  };
  try {
    const [cookieless, consented, exceptions] = await Promise.all([readCookieless(), readConsented(), readExceptions()]);
    return [...cookieless, ...consented, ...exceptions]
      .filter((row) => !filters.surface || row.surface === filters.surface)
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
      .slice(0, DEBUG_LIMIT);
  } catch {
    console.error("analytics debug read failed", { reason: "records_unavailable" });
    return null;
  }
}
