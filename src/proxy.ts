import { NextResponse, type NextRequest } from "next/server";
import {
  ANALYTICS_INTERNAL_COOKIE,
  ANALYTICS_ACQUISITION_COOKIE,
  ANALYTICS_SESSION_COOKIE,
  ANALYTICS_VISITOR_COOKIE,
  SESSION_TTL_SECONDS,
  signAnalyticsToken,
  verifyAnalyticsToken,
} from "@/lib/analytics-token";
import { acquisitionFromRequest } from "@/lib/analytics-taxonomy";
import { readAnalyticsConsent } from "@/lib/tracking-context";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const now = Math.floor(Date.now() / 1000);
  const consented = await readAnalyticsConsent(request);
  let sessionToken: string | null = null;
  let acquisitionToken: string | null = null;
  if (consented && request.nextUrl.pathname !== "/api/consent") {
    const existing = await verifyAnalyticsToken<{ id: string; exp: number }>("session", request.cookies.get(ANALYTICS_SESSION_COOKIE)?.value);
    sessionToken = await signAnalyticsToken("session", { id: existing?.id || crypto.randomUUID(), exp: now + SESSION_TTL_SECONDS });
    if (sessionToken) request.cookies.set(ANALYTICS_SESSION_COOKIE, sessionToken);
  }
  if (consented && (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/kontakt")) {
    const acquisition = acquisitionFromRequest({
      ownHost: request.nextUrl.hostname,
      referrer: request.headers.get("referer"),
      utmSource: request.nextUrl.searchParams.get("utm_source"),
      utmMedium: request.nextUrl.searchParams.get("utm_medium"),
      utmCampaign: request.nextUrl.searchParams.get("utm_campaign"),
      utmContent: request.nextUrl.searchParams.get("utm_content"),
    });
    if (acquisition.source !== "direct") {
      acquisitionToken = await signAnalyticsToken("acquisition", { acquisition, exp: now + SESSION_TTL_SECONDS });
      if (acquisitionToken) request.cookies.set(ANALYTICS_ACQUISITION_COOKIE, acquisitionToken);
    }
  }

  const authRoute = request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/auth");
  const { response, authenticated } = authRoute
    ? await updateSession(request)
    : { response: NextResponse.next({ request }), authenticated: false };
  const secure = request.nextUrl.protocol === "https:";
  if (sessionToken) response.cookies.set(ANALYTICS_SESSION_COOKIE, sessionToken, { httpOnly: true, sameSite: "lax", secure, maxAge: SESSION_TTL_SECONDS, path: "/" });
  if (acquisitionToken) response.cookies.set(ANALYTICS_ACQUISITION_COOKIE, acquisitionToken, { httpOnly: true, sameSite: "lax", secure, maxAge: SESSION_TTL_SECONDS, path: "/" });
  // The consent POST owns its response cookies. Other responses clear stale HttpOnly
  // identifiers as soon as they encounter a local deny or pending grant.
  if (!consented && !(request.nextUrl.pathname === "/api/consent" && request.method === "POST")) {
    for (const name of [ANALYTICS_SESSION_COOKIE, ANALYTICS_ACQUISITION_COOKIE, ANALYTICS_VISITOR_COOKIE]) {
      if (request.cookies.has(name)) response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", secure, maxAge: 0, path: "/" });
    }
  }
  if (authenticated && request.nextUrl.pathname.startsWith("/admin")) {
    const internalToken = await signAnalyticsToken("internal", { enabled: true as const, exp: now + 12 * 60 * 60 });
    if (internalToken) response.cookies.set(ANALYTICS_INTERNAL_COOKIE, internalToken, { httpOnly: true, sameSite: "lax", secure, maxAge: 12 * 60 * 60, path: "/" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"],
};
