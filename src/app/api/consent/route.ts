import { NextResponse, type NextRequest } from "next/server";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_VISITOR_COOKIE, VISITOR_TTL_SECONDS, signAnalyticsToken, verifyAnalyticsToken } from "@/lib/analytics-token";
import { createConsentToken } from "@/lib/tracking-context";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const consent = await verifyAnalyticsToken<{ analytics: boolean; marketing: boolean; version: number; exp: number }>(
    "consent",
    request.cookies.get(ANALYTICS_CONSENT_COOKIE)?.value,
  );
  return NextResponse.json(
    { choice: consent?.version === 1 ? { analytics: consent.analytics === true, marketing: consent.marketing === true } : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid-json" }, { status: 400 }); }
  const analytics = body.analytics === true;
  const marketing = body.marketing === true;
  if (marketing && body.analytics !== true && body.analytics !== false) return NextResponse.json({ error: "invalid-consent" }, { status: 400 });
  const token = await createConsentToken(analytics, marketing);
  if (!token) return NextResponse.json({ error: "consent-not-configured" }, { status: 503 });
  const secure = request.nextUrl.protocol === "https:";
  const response = NextResponse.json({ analytics, marketing });
  response.cookies.set(ANALYTICS_CONSENT_COOKIE, token, { sameSite: "lax", secure, maxAge: VISITOR_TTL_SECONDS, path: "/" });
  if (analytics) {
    const existing = await verifyAnalyticsToken<{ id: string; exp: number }>("visitor", request.cookies.get(ANALYTICS_VISITOR_COOKIE)?.value);
    const visitorToken = await signAnalyticsToken("visitor", { id: existing?.id || crypto.randomUUID(), exp: Math.floor(Date.now() / 1000) + VISITOR_TTL_SECONDS });
    if (visitorToken) response.cookies.set(ANALYTICS_VISITOR_COOKIE, visitorToken, { httpOnly: true, sameSite: "lax", secure, maxAge: VISITOR_TTL_SECONDS, path: "/" });
  } else {
    response.cookies.set(ANALYTICS_VISITOR_COOKIE, "", { httpOnly: true, sameSite: "lax", secure, maxAge: 0, path: "/" });
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
