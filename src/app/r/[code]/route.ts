import { NextResponse, type NextRequest } from "next/server";
import { findTrackingLinkByCode, trackEventBestEffort } from "@/lib/analytics";
import { trackingAcquisition } from "@/lib/analytics-taxonomy";
import { getSiteUrl } from "@/lib/env";
import { applyTrackingCookies, buildTrackingContext } from "@/lib/tracking-context";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const trackingLink = await findTrackingLinkByCode(code);
  if (!trackingLink) return noIndexRedirect(new URL("/", getSiteUrl()));
  const observed = trackingAcquisition({
    channelGroup: trackingLink.channel_group, source: trackingLink.source, medium: trackingLink.medium,
    campaign: trackingLink.campaign?.slug, trackingLinkId: trackingLink.id, campaignId: trackingLink.campaign_id,
    assetId: trackingLink.asset_id, placementId: trackingLink.placement_id,
    referralParticipantId: trackingLink.referral_participant_id,
  });
  const { context, cookies } = await buildTrackingContext(request, observed);
  try {
    await trackEventBestEffort({ eventId: crypto.randomUUID(), eventName: "tracking_entry", path: `/r/${trackingLink.code}`, context, trackingLink });
  } catch (error) {
    console.error("tracking entry failed", error);
  }
  const target = new URL(trackingLink.landing_path === "/kontakt" ? "/kontakt" : "/", getSiteUrl());
  const response = noIndexRedirect(target);
  applyTrackingCookies(response, cookies, request.nextUrl.protocol === "https:");
  return response;
}

function noIndexRedirect(url: URL) {
  const response = NextResponse.redirect(url, 302);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
