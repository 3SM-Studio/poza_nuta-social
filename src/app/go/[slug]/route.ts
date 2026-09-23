import { type NextRequest } from "next/server";
import { trackEventBestEffort } from "@/lib/analytics";
import { officialDestinationUrl } from "@/lib/analytics-taxonomy";
import { getPublicDestinations } from "@/lib/destinations";
import { applyTrackingCookies, buildTrackingContext } from "@/lib/tracking-context";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = (await getPublicDestinations()).find((item) => item.slug === slug) || null;
  const target = destination ? officialDestinationUrl(destination.slug, destination.url) : null;
  if (!destination || !target) return noIndexRedirect(new URL("/", request.url));

  const { context, cookies } = await buildTrackingContext(request);
  try {
    await trackEventBestEffort({
      eventId: crypto.randomUUID(), eventName: "outbound_click", path: `/go/${destination.slug}`,
      context, destination,
    });
  } catch (error) {
    console.error("tracking outbound failed", error);
  }

  const response = noIndexRedirect(new URL(target));
  applyTrackingCookies(response, cookies, request.nextUrl.protocol === "https:");
  return response;
}

function noIndexRedirect(url: URL) {
  return new Response(null, { status: 302, headers: { Location: url.toString(), "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
