import { NextResponse, type NextRequest } from "next/server";
import { trackEventBestEffort } from "@/lib/analytics";
import { effectiveAnalyticsMode } from "@/lib/analytics-mode";
import { trackCookielessBestEffort } from "@/lib/cookieless-analytics";
import { acquisitionFromRequest, EVENT_NAMES, sanitizePagePath, type AnalyticsEventName } from "@/lib/analytics-taxonomy";
import { getSiteUrl } from "@/lib/env";
import { validVisitId } from "@/lib/attribution";
import { applyTrackingCookies, buildTrackingContext } from "@/lib/tracking-context";
import { readBoundedJson } from "@/lib/bounded-json";
import { isPublicPath } from "@/lib/public-paths";

export const runtime = "nodejs";
const clientEvents = new Set<AnalyticsEventName>(["page_view", "contact_view", "contact_click", "hub_resumed"]);
const cookielessEvents = new Set<AnalyticsEventName>(["page_view", "contact_view", "contact_click"]);
const allowedFields = new Set(["eventId", "eventName", "path", "referrer", "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "properties"]);

export async function POST(request: NextRequest) {
  const parsed = await readBoundedJson(request, 12_000);
  if (!parsed.ok) return reply({ error: parsed.error }, parsed.error === "payload-too-large" ? 413 : 400);
  const body = parsed.value;
  if (Object.keys(body).some((key) => !allowedFields.has(key))) return reply({ error: "invalid-field" }, 400);
  const eventName = String(body.eventName || "") as AnalyticsEventName;
  if (!EVENT_NAMES.includes(eventName) || !clientEvents.has(eventName)) return reply({ error: "invalid-event" }, 400);
  const eventId = validVisitId(typeof body.eventId === "string" ? body.eventId : null);
  if (!eventId) return reply({ error: "invalid-event-id" }, 400);
  const path = sanitizePagePath(typeof body.path === "string" ? body.path : "/");
  if ((eventName === "contact_view" || eventName === "contact_click") && path !== "/kontakt") return reply({ error: "invalid-contact-path" }, 400);
  const mode = await effectiveAnalyticsMode(request);
  if (mode === "cookieless") {
    if (!cookielessEvents.has(eventName)) return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    if (!isPublicPath(body.path)) return reply({ error: "invalid-path" }, 400);
    const properties = body.properties;
    if (properties !== undefined && (typeof properties !== "object" || properties === null || Array.isArray(properties) || Object.keys(properties).some((key) => key !== "contactType"))) return reply({ error: "invalid-properties" }, 400);
    const contactType = properties && typeof properties === "object" && !Array.isArray(properties) ? (properties as Record<string, unknown>).contactType : undefined;
    if (contactType !== undefined && (eventName !== "contact_click" || contactType !== "email")) return reply({ error: "invalid-properties" }, 400);
    const currentPage = currentPageUrl(request, path);
    await trackCookielessBestEffort({
      eventId, eventName: eventName as "page_view" | "contact_view" | "contact_click", path, request,
      entry: { referrer: stringValue(body.referrer, 512), utmSource: currentPage?.searchParams.get("utm_source"), utmMedium: currentPage?.searchParams.get("utm_medium"), utmCampaign: currentPage?.searchParams.get("utm_campaign"), utmContent: currentPage?.searchParams.get("utm_content"), utmTerm: currentPage?.searchParams.get("utm_term") },
    });
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
  const properties = cleanProperties(body.properties);
  try {
    await trackEventBestEffort({ eventId, eventName, path, context, metadata: properties });
  } catch (error) {
    console.error("analytics request failed", error);
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
function cleanProperties(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = new Set(["navigationType", "contactType", "priorDestination", "resumeSignal", "elapsedBucket", "bfcache"]);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key, entry]) => allowed.has(key) && ["string", "number", "boolean"].includes(typeof entry))
    .map(([key, entry]) => [key, typeof entry === "string" ? entry.slice(0, 80) : entry]));
}
