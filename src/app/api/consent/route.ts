import { NextResponse, type NextRequest } from "next/server";
import { ANALYTICS_ACQUISITION_COOKIE, ANALYTICS_CONSENT_COOKIE, ANALYTICS_SESSION_COOKIE, ANALYTICS_VISITOR_COOKIE, SESSION_TTL_SECONDS, VISITOR_TTL_SECONDS, signAnalyticsToken, verifyAnalyticsToken } from "@/lib/analytics-token";
import { createConsentToken, readConsentChoice, readSignedConsentChoice, tokenMatchesEnvironment } from "@/lib/tracking-context";
import { readBoundedJson } from "@/lib/bounded-json";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONSENT_VERSION } from "@/lib/tracking-context";
import { CONSENT_PREFERENCE_COOKIE, pendingConsentAttemptId } from "@/lib/consent-preference";
import { resolveServerEnvironment } from "@/lib/runtime-environment";
import type { AnalyticsEnvironment } from "@/lib/analytics-taxonomy";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const choice = await readConsentChoice(request);
  return NextResponse.json(
    { choice: choice === null ? null : { analytics: choice } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const parsed = await readBoundedJson(request, 1_024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.error === "payload-too-large" ? 413 : 400 });
  const body = parsed.value;
  if (typeof body.analytics !== "boolean" || (body.marketing !== undefined && body.marketing !== false)) return NextResponse.json({ error: "invalid-consent" }, { status: 400 });
  const analytics = body.analytics;
  const environment = resolveServerEnvironment(request);
  const token = await createConsentToken(analytics, environment);
  if (!token) return NextResponse.json({ error: "consent-not-configured" }, { status: 503 });
  const priorChoice = await readSignedConsentChoice(request);
  const effectivePriorChoice = await readConsentChoice(request);
  const signedVisitor = await verifyAnalyticsToken<{ id: string; exp: number; environment?: AnalyticsEnvironment }>("visitor", request.cookies.get(ANALYTICS_VISITOR_COOKIE)?.value);
  const existing = tokenMatchesEnvironment(signedVisitor, environment) ? signedVisitor : null;
  let visitorId = analytics ? (effectivePriorChoice === true && existing?.id ? existing.id : crypto.randomUUID()) : existing?.id;
  const admin = createAdminClient();
  if (analytics) {
    if (!admin || !visitorId) return NextResponse.json({ error: "consent-evidence-unavailable" }, { status: 503 });
    const attemptId = pendingConsentAttemptId(request.cookies.get(CONSENT_PREFERENCE_COOKIE)?.value);
    const { error } = await admin.from("analytics_consent_evidence").upsert({
      id: attemptId || crypto.randomUUID(), visitor_id: visitorId, analytics_enabled: true, consent_version: CONSENT_VERSION,
      environment,
    }, { onConflict: "id", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: "consent-evidence-unavailable" }, { status: 503 });
    if (attemptId) {
      const { data, error: readError } = await admin.from("analytics_consent_evidence")
        .select("visitor_id,analytics_enabled,consent_version,environment").eq("id", attemptId).single();
      if (readError || !data.analytics_enabled || data.consent_version !== CONSENT_VERSION || data.environment !== environment) {
        return NextResponse.json({ error: "consent-evidence-unavailable" }, { status: 503 });
      }
      visitorId = data.visitor_id;
    }
  } else if (priorChoice === true && visitorId && admin) {
    const { error } = await admin.from("analytics_consent_evidence").insert({
      id: crypto.randomUUID(), visitor_id: visitorId, analytics_enabled: false, consent_version: CONSENT_VERSION,
      environment,
    });
    if (error) console.error("consent withdrawal evidence failed", error.message);
  }
  const secure = request.nextUrl.protocol === "https:";
  const response = NextResponse.json({ analytics });
  response.cookies.set(ANALYTICS_CONSENT_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, maxAge: VISITOR_TTL_SECONDS, path: "/" });
  if (analytics) {
    const visitorToken = await signAnalyticsToken("visitor", { id: visitorId, environment, exp: Math.floor(Date.now() / 1000) + VISITOR_TTL_SECONDS });
    if (visitorToken) response.cookies.set(ANALYTICS_VISITOR_COOKIE, visitorToken, { httpOnly: true, sameSite: "lax", secure, maxAge: VISITOR_TTL_SECONDS, path: "/" });
    const previousSession = effectivePriorChoice === true
      ? await verifyAnalyticsToken<{ id: string; exp: number; environment?: AnalyticsEnvironment }>("session", request.cookies.get(ANALYTICS_SESSION_COOKIE)?.value)
      : null;
    const sessionToken = await signAnalyticsToken("session", { id: tokenMatchesEnvironment(previousSession, environment) ? previousSession?.id || crypto.randomUUID() : crypto.randomUUID(), environment, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS });
    if (sessionToken) response.cookies.set(ANALYTICS_SESSION_COOKIE, sessionToken, { httpOnly: true, sameSite: "lax", secure, maxAge: SESSION_TTL_SECONDS, path: "/" });
  } else {
    for (const name of [ANALYTICS_VISITOR_COOKIE, ANALYTICS_SESSION_COOKIE, ANALYTICS_ACQUISITION_COOKIE]) {
      response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", secure, maxAge: 0, path: "/" });
    }
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
