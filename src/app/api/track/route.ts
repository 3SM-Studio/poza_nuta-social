import { NextResponse, type NextRequest } from "next/server";
import { trackEventBestEffort } from "@/lib/analytics";
import { acquisitionFromRequest, EVENT_NAMES, sanitizePath, type AnalyticsEventName } from "@/lib/analytics-taxonomy";
import { getSiteUrl } from "@/lib/env";
import { validVisitId } from "@/lib/attribution";
import { applyTrackingCookies, buildTrackingContext } from "@/lib/tracking-context";

export const runtime = "nodejs";
const clientEvents = new Set<AnalyticsEventName>(["page_view", "contact_view", "contact_click", "hub_resumed"]);

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 12_000) return reply({ error: "payload-too-large" }, 413);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "invalid-json" }, 400); }
  const eventName = String(body.eventName || "") as AnalyticsEventName;
  if (!EVENT_NAMES.includes(eventName) || !clientEvents.has(eventName)) return reply({ error: "invalid-event" }, 400);
  const eventId = validVisitId(typeof body.eventId === "string" ? body.eventId : null);
  if (!eventId) return reply({ error: "invalid-event-id" }, 400);
  const path = sanitizePath(typeof body.path === "string" ? body.path : "/");
  if ((eventName === "contact_view" || eventName === "contact_click") && path !== "/kontakt") return reply({ error: "invalid-contact-path" }, 400);
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
function cleanProperties(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = new Set(["navigationType", "contactType", "priorDestination", "resumeSignal", "elapsedBucket", "bfcache"]);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key, entry]) => allowed.has(key) && ["string", "number", "boolean"].includes(typeof entry))
    .map(([key, entry]) => [key, typeof entry === "string" ? entry.slice(0, 80) : entry]));
}
