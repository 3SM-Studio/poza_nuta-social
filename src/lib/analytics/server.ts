import { createAdminClient } from "@/lib/supabase/admin";
import { settleWithin } from "@/lib/async";
import { trackingAcquisition, type AcquisitionContext, type AnalyticsEventName } from "@/lib/analytics-taxonomy";
import type { TrackingContext } from "@/lib/tracking-context";
import type { AnalyticsDashboard, Destination, TrackingLink } from "@/lib/types";
import { recordQualityException, type QualitySurface } from "@/lib/analytics/data-quality";

export type TrackEventInput = {
  eventId: string;
  eventName: AnalyticsEventName;
  path: string;
  context: TrackingContext;
  trackingLink?: TrackingLink | null;
  destination?: Destination | null;
  metadata?: Record<string, unknown>;
  snapshots?: Record<string, unknown>;
  qualitySurface: QualitySurface;
};

export async function trackEvent(input: TrackEventInput) {
  if (!input.context.consent.analytics) return { stored: false as const, reason: "consent-required" };
  const admin = createAdminClient();
  if (!admin) return { stored: false as const, reason: "analytics-not-configured" };
  const link = input.trackingLink;
  const attributed: AcquisitionContext = link
    ? trackingAcquisition({
        channelGroup: link.channel_group,
        source: link.source,
        medium: link.medium,
        campaign: link.campaign?.slug,
        trackingLinkId: link.id,
        campaignId: link.campaign_id,
        assetId: link.asset_id,
        placementId: link.placement_id,
        referralParticipantId: link.referral_participant_id,
      })
    : input.context.attributionCandidate;
  const snapshots = {
    ...(link ? {
      trackingLinkCode: link.code,
      trackingLinkLabel: link.label,
      campaignLabel: link.campaign?.name || null,
      campaignSlug: link.campaign?.slug || null,
      assetLabel: link.asset_entity?.label || link.asset || null,
      placementLabel: link.placement_entity?.label || link.placement || null,
      channelGroup: link.channel_group,
      source: link.source,
      medium: link.medium,
      referralParticipantLabel: link.referral_participant?.display_name || null,
    } : {}),
    ...(input.destination ? {
      destinationSlug: input.destination.slug,
      destinationLabel: input.destination.label,
      destinationDomain: new URL(input.destination.url).hostname,
    } : {}),
    ...input.snapshots,
  };
  const { data, error } = await admin.rpc("analytics_ingest_event_v1", {
    p_event_id: input.eventId,
    p_event_name: input.eventName,
    p_session_id: input.context.identity.sessionId,
    p_visitor_id: input.context.identity.visitorId,
    p_environment: input.context.environment,
    p_traffic_class: input.context.trafficClass,
    p_analytics_consent: input.context.consent.analytics,
    p_marketing_consent: input.context.consent.marketing,
    p_path: input.path,
    p_observed_context: input.context.observed,
    p_attributed_context: attributed,
    p_dimension_snapshots: snapshots,
    p_tracking_link_id: link?.id || null,
    p_destination_id: input.destination?.id || null,
    p_destination_slug: input.destination?.slug || null,
    p_device_type: input.context.device.deviceType,
    p_browser_family: input.context.device.browserFamily,
    p_os_family: input.context.device.osFamily,
    p_metadata: input.metadata || {},
  });
  if (error) {
    console.error("analytics ingest failed", { surface: input.qualitySurface, reason: "primary_rpc_failure" });
    return { stored: false as const, reason: "ingest-failed" };
  }
  if (data && typeof data === "object" && "duplicate" in data && data.duplicate === true) {
    try {
      await recordQualityException({ surface: input.qualitySurface, mode: "consented", eventName: input.eventName, outcome: "duplicate", reason: "idempotent_retry" });
    } catch { /* Quality telemetry must not alter the primary result. */ }
  }
  return { stored: true as const, result: data };
}

export async function trackEventBestEffort(input: TrackEventInput) {
  return settleWithin(trackEvent(input), 900, { stored: false as const, reason: "deadline" });
}

export async function findTrackingLinkByCode(code?: string | null) {
  if (!code) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const result = await settleWithin(Promise.resolve(admin.from("tracking_links")
    .select("id,code,label,channel_group,source,medium,asset,placement,asset_id,placement_id,distribution_unit,landing_path,active,active_from,active_to,campaign_id,referral_participant_id,campaigns(id,name,slug,status),analytics_assets(id,label,slug),analytics_placements(id,label,slug),referral_participants(id,display_name)")
    .eq("code", code.toUpperCase()).eq("active", true).maybeSingle()), 1_200, null);
  if (!result || result.error || !result.data) return null;
  const { campaigns, analytics_assets, analytics_placements, referral_participants, ...link } = result.data;
  const campaign = firstRelation(campaigns);
  if (campaign?.status === "archived") return null;
  const now = Date.now();
  if ((link.active_from && Date.parse(link.active_from) > now) || (link.active_to && Date.parse(link.active_to) <= now)) return null;
  return { ...link, campaign: campaign || null, asset_entity: firstRelation(analytics_assets) || null, placement_entity: firstRelation(analytics_placements) || null, referral_participant: firstRelation(referral_participants) || null } as TrackingLink;
}

export async function getDashboardRange(fromDate: string, toDateExclusive: string): Promise<AnalyticsDashboard | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("analytics_dashboard_v2", { p_from_date: fromDate, p_to_date_exclusive: toDateExclusive });
  if (error || !isDashboardPayload(data)) {
    console.error("analytics dashboard v2 read failed", { reason: error ? "rpc_error" : "invalid_response" });
    return null;
  }
  return data;
}

function firstRelation<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] || null : value || null; }

const dashboardMetrics = [
  "pageViews", "trackingEntries", "sessions", "visitors", "newVisitors", "returningVisitors", "returningVisitorRate",
  "outboundSessions", "outboundSessionRate", "outboundClicks", "clicksPerOutboundSession", "multiDestinationSessions",
  "multiDestinationSessionRate", "returnToHubSessions", "returnToHubRate", "contactInterestSessions", "contactInterestRate", "contactClickRate",
] as const satisfies ReadonlyArray<keyof AnalyticsDashboard>;
const dashboardRankings = [
  "topSources", "topCampaigns", "topAssets", "topPlacements", "topDestinations", "topTrackingLinks", "trafficBreakdown",
] as const satisfies ReadonlyArray<keyof AnalyticsDashboard>;

function isDashboardPayload(value: unknown): value is AnalyticsDashboard {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  const finite = (item: unknown) => typeof item === "number" && Number.isFinite(item);
  const ranking = (item: unknown) => Array.isArray(item) && item.every((entry) =>
    entry && typeof entry === "object" && typeof entry.label === "string" && finite(entry.value));
  return dashboardMetrics.every((key) => finite(row[key]))
    && dashboardRankings.every((key) => ranking(row[key]))
    && Array.isArray(row.timeSeries)
    && row.timeSeries.every((entry) => entry && typeof entry === "object" && typeof entry.date === "string"
      && finite(entry.sessions) && finite(entry.outboundSessions));
}
