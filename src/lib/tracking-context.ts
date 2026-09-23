import type { NextRequest } from "next/server";
import {
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_ACQUISITION_COOKIE,
  ANALYTICS_INTERNAL_COOKIE,
  ANALYTICS_SESSION_COOKIE,
  ANALYTICS_TEST_COOKIE,
  ANALYTICS_VISITOR_COOKIE,
  SESSION_TTL_SECONDS,
  VISITOR_TTL_SECONDS,
  signAnalyticsToken,
  verifyAnalyticsToken,
} from "./analytics-token";
import {
  acquisitionFromRequest,
  type AcquisitionContext,
  type AnalyticsEnvironment,
  type TrafficClass,
} from "./analytics-taxonomy";
import { deviceCategory } from "./attribution";
import { getSiteUrl } from "./env";

type IdentityToken = { id: string; exp: number };
type ConsentToken = { analytics: boolean; marketing: boolean; version: 1; exp: number };
type FlagToken = { enabled: true; exp: number };
type AcquisitionToken = { acquisition: AcquisitionContext; exp: number };

export type TrackingContext = {
  environment: AnalyticsEnvironment;
  trafficClass: TrafficClass;
  consent: { analytics: boolean; marketing: boolean };
  identity: { visitorId: string | null; sessionId: string };
  observed: AcquisitionContext;
  attributionCandidate: AcquisitionContext;
  device: ReturnType<typeof deviceCategory>;
};

export type TrackingCookie = { name: string; value: string; maxAge: number; httpOnly: boolean };

export async function buildTrackingContext(request: NextRequest, observedOverride?: AcquisitionContext) {
  const now = Math.floor(Date.now() / 1000);
  const consent = await verifyAnalyticsToken<ConsentToken>("consent", request.cookies.get(ANALYTICS_CONSENT_COOKIE)?.value);
  const session = await verifyAnalyticsToken<IdentityToken>("session", request.cookies.get(ANALYTICS_SESSION_COOKIE)?.value);
  const visitor = consent?.analytics
    ? await verifyAnalyticsToken<IdentityToken>("visitor", request.cookies.get(ANALYTICS_VISITOR_COOKIE)?.value)
    : null;
  const internal = await verifyAnalyticsToken<FlagToken>("internal", request.cookies.get(ANALYTICS_INTERNAL_COOKIE)?.value);
  const test = await verifyAnalyticsToken<FlagToken>("test", request.cookies.get(ANALYTICS_TEST_COOKIE)?.value);
  const bootstrap = await verifyAnalyticsToken<AcquisitionToken>("acquisition", request.cookies.get(ANALYTICS_ACQUISITION_COOKIE)?.value);
  const sessionId = session?.id || crypto.randomUUID();
  const visitorId = consent?.analytics ? visitor?.id || null : null;
  const ownHost = new URL(getSiteUrl()).hostname;
  const observed = observedOverride || acquisitionFromRequest({
    ownHost,
    referrer: request.headers.get("referer"),
    utmSource: request.nextUrl.searchParams.get("utm_source"),
    utmMedium: request.nextUrl.searchParams.get("utm_medium"),
    utmCampaign: request.nextUrl.searchParams.get("utm_campaign"),
    utmContent: request.nextUrl.searchParams.get("utm_content"),
  });
  const context: TrackingContext = {
    environment: analyticsEnvironment(request),
    trafficClass: test ? "test" : internal ? "internal" : isConservativeBot(request.headers.get("user-agent")) ? "bot" : "external",
    consent: { analytics: Boolean(consent?.analytics), marketing: Boolean(consent?.marketing) },
    identity: { visitorId, sessionId },
    observed,
    attributionCandidate: observed.source === "direct" && bootstrap?.acquisition ? bootstrap.acquisition : observed,
    device: deviceCategory(request.headers.get("user-agent")),
  };

  const cookies: TrackingCookie[] = [];
  const sessionToken = await signAnalyticsToken("session", { id: sessionId, exp: now + SESSION_TTL_SECONDS });
  if (sessionToken) cookies.push({ name: ANALYTICS_SESSION_COOKIE, value: sessionToken, maxAge: SESSION_TTL_SECONDS, httpOnly: true });
  if (observed.source !== "direct") {
    const acquisitionToken = await signAnalyticsToken("acquisition", { acquisition: observed, exp: now + SESSION_TTL_SECONDS });
    if (acquisitionToken) cookies.push({ name: ANALYTICS_ACQUISITION_COOKIE, value: acquisitionToken, maxAge: SESSION_TTL_SECONDS, httpOnly: true });
  }
  return { context, cookies };
}

export async function createConsentToken(analytics: boolean, marketing: boolean) {
  return signAnalyticsToken("consent", {
    analytics,
    marketing,
    version: 1 as const,
    exp: Math.floor(Date.now() / 1000) + VISITOR_TTL_SECONDS,
  });
}

export function applyTrackingCookies(response: Response, cookies: TrackingCookie[], secure: boolean) {
  for (const cookie of cookies) {
    response.headers.append("Set-Cookie", serializeCookie(cookie, secure));
  }
}

export function analyticsEnvironment(request: NextRequest): AnalyticsEnvironment {
  const vercel = process.env.VERCEL_ENV;
  if (vercel === "production") return "production";
  if (vercel === "preview") return "preview";
  if (process.env.ANALYTICS_ENV === "staging") return "staging";
  const host = request.nextUrl.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "development";
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function isConservativeBot(userAgent?: string | null) {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return false;
  return /(?:googlebot|bingbot|yandexbot|duckduckbot|baiduspider|gptbot|oai-searchbot|chatgpt-user|claudebot|anthropic-ai|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|uptimerobot|pingdom|statuscake|headlesschrome|python-requests|curl\/|wget\/|sqlmap|nikto)/.test(ua);
}

function serializeCookie(cookie: TrackingCookie, secure: boolean) {
  return `${cookie.name}=${cookie.value}; Path=/; Max-Age=${cookie.maxAge}; SameSite=Lax${cookie.httpOnly ? "; HttpOnly" : ""}${secure ? "; Secure" : ""}`;
}
