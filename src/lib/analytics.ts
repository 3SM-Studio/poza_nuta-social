import { createAdminClient } from "@/lib/supabase/admin";
import { settleWithin } from "@/lib/async";
import { trackingAcquisition, type AcquisitionContext, type AnalyticsEventName } from "@/lib/analytics-taxonomy";
import type { TrackingContext } from "@/lib/tracking-context";
import type { AnalyticsDashboard, Destination, TrackingLink } from "@/lib/types";

export type TrackEventInput = {
  eventId: string;
  eventName: AnalyticsEventName;
  path: string;
  context: TrackingContext;
  trackingLink?: TrackingLink | null;
  destination?: Destination | null;
  metadata?: Record<string, unknown>;
  snapshots?: Record<string, unknown>;
};

export async function trackEvent(input: TrackEventInput) {
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
    console.error("analytics ingest failed", error.message);
    return { stored: false as const, reason: "ingest-failed" };
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

export async function getDashboardRange(fromDate: string, toDateExclusive: string): Promise<AnalyticsDashboard> {
  const empty: AnalyticsDashboard = {
    pageViews: 0, trackingEntries: 0, sessions: 0, visitors: 0, newVisitors: 0, returningVisitors: 0, returningVisitorRate: 0, outboundSessions: 0,
    outboundSessionRate: 0, outboundClicks: 0, clicksPerOutboundSession: 0,
    multiDestinationSessions: 0, multiDestinationSessionRate: 0, returnToHubSessions: 0,
    returnToHubRate: 0, contactInterestSessions: 0, contactInterestRate: 0, contactClickRate: 0,
    topSources: [], topCampaigns: [], topAssets: [], topPlacements: [], topDestinations: [], topTrackingLinks: [], timeSeries: [], trafficBreakdown: [],
  };
  const admin = createAdminClient();
  if (!admin) return empty;
  const { data, error } = await admin.rpc("analytics_dashboard_v2", { p_from_date: fromDate, p_to_date_exclusive: toDateExclusive });
  if (error || !data) {
    console.error("analytics dashboard v2 failed", error?.message);
    return empty;
  }
  const row = data as Record<string, unknown>;
  return {
    ...empty,
    pageViews: numeric(row.pageViews), trackingEntries: numeric(row.trackingEntries), sessions: numeric(row.sessions), visitors: numeric(row.visitors), newVisitors: numeric(row.newVisitors), returningVisitors: numeric(row.returningVisitors), returningVisitorRate: numeric(row.returningVisitorRate),
    outboundSessions: numeric(row.outboundSessions), outboundSessionRate: numeric(row.outboundSessionRate), outboundClicks: numeric(row.outboundClicks),
    clicksPerOutboundSession: numeric(row.clicksPerOutboundSession), multiDestinationSessions: numeric(row.multiDestinationSessions),
    multiDestinationSessionRate: numeric(row.multiDestinationSessionRate), returnToHubSessions: numeric(row.returnToHubSessions),
    returnToHubRate: numeric(row.returnToHubRate), contactInterestSessions: numeric(row.contactInterestSessions),
    contactInterestRate: numeric(row.contactInterestRate), contactClickRate: numeric(row.contactClickRate),
    topSources: rows(row.topSources), topCampaigns: rows(row.topCampaigns), topAssets: rows(row.topAssets), topPlacements: rows(row.topPlacements), topDestinations: rows(row.topDestinations), topTrackingLinks: rows(row.topTrackingLinks),
    timeSeries: (Array.isArray(row.timeSeries) ? row.timeSeries : []) as AnalyticsDashboard["timeSeries"],
    trafficBreakdown: rows(row.trafficBreakdown),
  };
}

function firstRelation<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] || null : value || null; }
function numeric(value: unknown) { return Number(value || 0); }
function rows(value: unknown) { return (Array.isArray(value) ? value : []) as Array<{ label: string; value: number }>; }
