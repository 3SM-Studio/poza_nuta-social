import type { NextRequest } from "next/server";
import { settleWithin } from "./async";
import { analyticsEnvironment, isConservativeBot } from "./tracking-context";
import { domainMatches, normalizedHost, sanitizeTaxonomyValue, type AnalyticsEventName } from "./analytics-taxonomy";
import { ANALYTICS_PROJECT_KEY } from "./analytics-project";
import { getSiteUrl } from "./env";
import { createAdminClient } from "./supabase/admin";
import type { Destination, TrackingLink } from "./types";
import { recordQualityException, type QualitySurface } from "./analytics/data-quality";
import { ownAnalyticsHost } from "./runtime-environment";

export type CookielessEventName = Extract<AnalyticsEventName, "page_view" | "contact_view" | "contact_click" | "tracking_entry" | "outbound_click">;
export type CookielessEventInput = {
  eventId: string;
  eventName: CookielessEventName;
  path: string;
  request: NextRequest;
  entry?: { referrer?: string | null; utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null; utmContent?: string | null; utmTerm?: string | null };
  trackingLink?: TrackingLink;
  destination?: Destination;
  qualitySurface: QualitySurface;
};

export async function trackCookielessBestEffort(input: CookielessEventInput) {
  try {
    return await settleWithin(ingest(input), 900, false);
  } catch {
    console.error("cookieless analytics failed", { surface: input.qualitySurface, reason: "primary_ingest_failure" });
    return false;
  }
}

async function ingest(input: CookielessEventInput) {
  const admin = createAdminClient();
  if (!admin) return false;
  const params = input.request.nextUrl.searchParams;
  const entry = input.entry;
  const referrerHost = normalizedHost(entry?.referrer || input.request.headers.get("referer"));
  const ownHost = ownAnalyticsHost(input.request, getSiteUrl());
  // Only the current request/page entry is observed. No acquisition cookie is read.
  const { data, error } = await admin.rpc("analytics_ingest_cookieless_v1", {
    p_event_id: input.eventId,
    p_project_key: ANALYTICS_PROJECT_KEY,
    p_event_name: input.eventName,
    p_environment: analyticsEnvironment(input.request),
    p_traffic_class: isConservativeBot(input.request.headers.get("user-agent")) ? "bot" : "external",
    p_path: input.path,
    p_referrer_host: referrerHost && !domainMatches(referrerHost, ownHost) ? referrerHost : null,
    p_utm_source: sanitizeTaxonomyValue(entry?.utmSource || params.get("utm_source"), 64),
    p_utm_medium: sanitizeTaxonomyValue(entry?.utmMedium || params.get("utm_medium"), 64),
    p_utm_campaign: sanitizeTaxonomyValue(entry?.utmCampaign || params.get("utm_campaign"), 96),
    p_utm_content: sanitizeTaxonomyValue(entry?.utmContent || params.get("utm_content"), 96),
    p_utm_term: sanitizeTaxonomyValue(entry?.utmTerm || params.get("utm_term"), 96),
    p_tracking_link_id: input.trackingLink?.id || null,
    p_campaign_id: input.trackingLink?.campaign_id || null,
    p_asset_id: input.trackingLink?.asset_id || null,
    p_placement_id: input.trackingLink?.placement_id || null,
    p_destination_id: input.destination?.id || null,
    p_destination_slug: input.destination?.slug || null,
  });
  if (error) { console.error("cookieless ingest failed", { surface: input.qualitySurface, reason: "primary_rpc_failure" }); return false; }
  if (data === false) {
    try {
      await recordQualityException({ surface: input.qualitySurface, mode: "cookieless", eventName: input.eventName, outcome: "duplicate", reason: "idempotent_retry" });
    } catch { /* Quality telemetry must not alter the primary result. */ }
  }
  return true;
}
