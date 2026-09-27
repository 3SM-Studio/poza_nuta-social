import { NextResponse, type NextRequest } from "next/server";
import { trackEventBestEffort } from "@/lib/analytics/server";
import { effectiveAnalyticsMode } from "@/lib/analytics-mode";
import { trackCookielessBestEffort } from "@/lib/cookieless-analytics";
import { acquisitionFromRequest } from "@/lib/analytics-taxonomy";
import { isClientEventName, isClientEventPayload } from "@/lib/analytics/contract";
import { marketingCta, marketingSection } from "@/lib/analytics/marketing-journey";
import { getSiteUrl } from "@/lib/env";
import { validVisitId } from "@/lib/attribution";
import { applyTrackingCookies, buildTrackingContext } from "@/lib/tracking-context";
import { readBoundedJson } from "@/lib/bounded-json";
import { isPublicPath } from "@/lib/public-paths";
import { recordQualityException } from "@/lib/analytics/data-quality";

export const runtime = "nodejs";
const allowedFields = new Set(["eventId", "eventName", "path", "referrer", "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "properties"]);

export async function POST(request: NextRequest) {
  const parsed = await readBoundedJson(request, 12_000);
  if (!parsed.ok) {
    await recordQualityException({ surface: "api_track", outcome: "rejected", reason: parsed.error === "payload-too-large" ? "payload_too_large" : "invalid_json" });
    return reply({ error: parsed.error }, parsed.error === "payload-too-large" ? 413 : 400);
  }
  const body = parsed.value;
  if (Object.keys(body).some((key) => !allowedFields.has(key))) {
    await recordQualityException({ surface: "api_track", outcome: "rejected", reason: "forbidden_field" });
    return reply({ error: "invalid-field" }, 400);
  }
  const eventName = body.eventName;
  if (!isClientEventName(eventName)) {
    await recordQualityException({ surface: "api_track", outcome: "rejected", reason: "invalid_event" });
    return reply({ error: "invalid-event" }, 400);
  }
  if (!isClientEventPayload(eventName, body.properties)) {
    await recordQualityException({ surface: "api_track", eventName, outcome: "rejected", reason: "invalid_payload" });
    return reply({ error: "invalid-properties" }, 400);
  }
  const eventId = validVisitId(typeof body.eventId === "string" ? body.eventId : null);
  if (!eventId) {
    await recordQualityException({ surface: "api_track", eventName, outcome: "rejected", reason: "invalid_event_id" });
    return reply({ error: "invalid-event-id" }, 400);
  }
  if (!isPublicPath(body.path)) {
    await recordQualityException({ surface: "api_track", eventName, outcome: "rejected", reason: "invalid_path" });
    return reply({ error: "invalid-path" }, 400);
  }
  const path = body.path;
  if ((eventName === "contact_view" || eventName === "contact_click") && path !== "/kontakt") {
    await recordQualityException({ surface: "api_track", eventName, outcome: "rejected", reason: "invalid_path" });
    return reply({ error: "invalid-contact-path" }, 400);
  }
  const cta = eventName === "cta_click" ? marketingCta((body.properties as { ctaId: string }).ctaId) : null;
  const section = eventName === "section_view" ? marketingSection((body.properties as { sectionId: string }).sectionId) : null;
  if ((cta && cta.sourcePath !== path) || (section && section.sourcePath !== path)) {
    await recordQualityException({ surface: "api_track", eventName, outcome: "rejected", reason: "invalid_path" });
    return reply({ error: "invalid-journey-path" }, 400);
  }
  const mode = await effectiveAnalyticsMode(request);
  if (mode === "cookieless") {
    if (eventName === "hub_resumed" || eventName === "cta_click" || eventName === "section_view") {
      await recordQualityException({ surface: "api_track", mode, eventName, outcome: "filtered", reason: "unsupported_mode" });
      return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }
    const currentPage = currentPageUrl(request, path);
    try {
      await trackCookielessBestEffort({
        eventId, eventName, path, request, qualitySurface: "api_track",
        entry: { referrer: stringValue(body.referrer, 512), utmSource: currentPage?.searchParams.get("utm_source"), utmMedium: currentPage?.searchParams.get("utm_medium"), utmCampaign: currentPage?.searchParams.get("utm_campaign"), utmContent: currentPage?.searchParams.get("utm_content"), utmTerm: currentPage?.searchParams.get("utm_term") },
      });
    } catch {
      console.error("cookieless analytics request failed", { surface: "api_track", reason: "primary_ingest_failure" });
    }
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  }
  const observed = acquisitionFromRequest({
    ownHost: new URL(getSiteUrl()).hostname,
    referrer: stringValue(body.referrer, 512) || request.headers.get("referer"),
    utmSource: stringValue(body.utmSource, 64),
    utmMedium: stringValue(body.utmMedium, 64),
    utmCampaign: stringValue(body.utmCampaign, 96),
    utmContent: stringValue(body.utmContent, 96),
  });
  const { context, cookies } = await buildTrackingContext(request, observed);
  try {
    await trackEventBestEffort({ eventId, eventName, path, context, qualitySurface: "api_track", metadata: cta
      ? { ctaId: (body.properties as { ctaId: string }).ctaId, ctaLocation: cta.location, sourcePath: cta.sourcePath, destinationPath: cta.destinationPath, journey: cta.journey, audience: cta.audience }
      : section ? { sectionId: (body.properties as { sectionId: string }).sectionId, sourcePath: section.sourcePath, journey: section.journey, audience: section.audience }
      : body.properties as Record<string, unknown> | undefined });
  } catch {
    console.error("analytics request failed", { surface: "api_track", reason: "primary_ingest_failure" });
  }
  const response = new NextResponse(null, { status: 204 });
  applyTrackingCookies(response, cookies, request.nextUrl.protocol === "https:");
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function reply(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
function stringValue(value: unknown, limit: number) { return typeof value === "string" ? value.slice(0, limit) : null; }
function currentPageUrl(request: NextRequest, path: string) {
  try {
    const referrer = new URL(request.headers.get("referer") || "");
    return referrer.origin === request.nextUrl.origin && referrer.pathname === path ? referrer : null;
  } catch { return null; }
}
