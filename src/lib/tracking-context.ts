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
import { CONSENT_PREFERENCE_COOKIE, parseLocalPreference } from "./consent-preference";
import { CONSENT_VERSION } from "./consent-version";
import { ownAnalyticsHost, resolveServerEnvironment } from "./runtime-environment";

type IdentityToken = { id: string; exp: number; environment?: AnalyticsEnvironment };
export { CONSENT_VERSION } from "./consent-version";
type ConsentToken = { analytics: boolean; marketing: boolean; version: number; exp: number; environment?: AnalyticsEnvironment };
type FlagToken = { enabled: true; exp: number };
type AcquisitionToken = { acquisition: AcquisitionContext; exp: number; environment?: AnalyticsEnvironment };

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
  const environment = analyticsEnvironment(request);
  const consent = await readAnalyticsConsent(request);
  const signedSession = await verifyAnalyticsToken<IdentityToken>("session", request.cookies.get(ANALYTICS_SESSION_COOKIE)?.value);
  const session = tokenMatchesEnvironment(signedSession, environment) ? signedSession : null;
  const visitor = consent
    ? await verifyAnalyticsToken<IdentityToken>("visitor", request.cookies.get(ANALYTICS_VISITOR_COOKIE)?.value)
    : null;
  const internal = await verifyAnalyticsToken<FlagToken>("internal", request.cookies.get(ANALYTICS_INTERNAL_COOKIE)?.value);
  const test = await verifyAnalyticsToken<FlagToken>("test", request.cookies.get(ANALYTICS_TEST_COOKIE)?.value);
  const signedBootstrap = await verifyAnalyticsToken<AcquisitionToken>("acquisition", request.cookies.get(ANALYTICS_ACQUISITION_COOKIE)?.value);
  const bootstrap = tokenMatchesEnvironment(signedBootstrap, environment) ? signedBootstrap : null;
  const sessionId = session?.id || crypto.randomUUID();
  const visitorId = consent && tokenMatchesEnvironment(visitor, environment) ? visitor?.id || null : null;
  const ownHost = ownAnalyticsHost(request, getSiteUrl());
  const observed = observedOverride || acquisitionFromRequest({
    ownHost,
    referrer: request.headers.get("referer"),
    utmSource: request.nextUrl.searchParams.get("utm_source"),
    utmMedium: request.nextUrl.searchParams.get("utm_medium"),
    utmCampaign: request.nextUrl.searchParams.get("utm_campaign"),
    utmContent: request.nextUrl.searchParams.get("utm_content"),
  });
  const context: TrackingContext = {
    environment,
    trafficClass: test ? "test" : internal ? "internal" : isConservativeBot(request.headers.get("user-agent")) ? "bot" : "external",
    consent: { analytics: consent, marketing: false },
    identity: { visitorId, sessionId },
    observed,
    attributionCandidate: observed.source === "direct" && bootstrap?.acquisition ? bootstrap.acquisition : observed,
    device: deviceCategory(request.headers.get("user-agent")),
  };

  const cookies: TrackingCookie[] = [];
  const sessionToken = consent ? await signAnalyticsToken("session", { id: sessionId, environment, exp: now + SESSION_TTL_SECONDS }) : null;
  if (sessionToken) cookies.push({ name: ANALYTICS_SESSION_COOKIE, value: sessionToken, maxAge: SESSION_TTL_SECONDS, httpOnly: true });
  if (consent && observed.source !== "direct") {
    const acquisitionToken = await signAnalyticsToken("acquisition", { acquisition: observed, environment, exp: now + SESSION_TTL_SECONDS });
    if (acquisitionToken) cookies.push({ name: ANALYTICS_ACQUISITION_COOKIE, value: acquisitionToken, maxAge: SESSION_TTL_SECONDS, httpOnly: true });
  }
  return { context, cookies };
}

export async function readConsentChoice(request: NextRequest): Promise<boolean | null> {
  if (parseLocalPreference(request.cookies.get(CONSENT_PREFERENCE_COOKIE)?.value)) return false;
  return readSignedConsentChoice(request);
}

export async function readSignedConsentChoice(request: NextRequest): Promise<boolean | null> {
  const token = await verifyAnalyticsToken<ConsentToken>("consent", request.cookies.get(ANALYTICS_CONSENT_COOKIE)?.value);
  return tokenMatchesEnvironment(token, analyticsEnvironment(request)) && token?.version === CONSENT_VERSION && typeof token.analytics === "boolean" ? token.analytics : null;
}

export async function readAnalyticsConsent(request: NextRequest): Promise<boolean> {
  return (await readConsentChoice(request)) === true;
}

export async function createConsentToken(analytics: boolean, environment: AnalyticsEnvironment) {
  return signAnalyticsToken("consent", {
    analytics,
    marketing: false,
    version: CONSENT_VERSION,
    environment,
    exp: Math.floor(Date.now() / 1000) + VISITOR_TTL_SECONDS,
  });
}

export function tokenMatchesEnvironment(token: { environment?: AnalyticsEnvironment } | null, environment: AnalyticsEnvironment) {
  // Legacy signed tokens predate environment binding. Preview must never reuse one.
  return Boolean(token && (token.environment === environment || (!token.environment && environment !== "preview")));
}

export function applyTrackingCookies(response: Response, cookies: TrackingCookie[], secure: boolean) {
  for (const cookie of cookies) {
    response.headers.append("Set-Cookie", serializeCookie(cookie, secure));
  }
}

export function analyticsEnvironment(request: NextRequest): AnalyticsEnvironment {
  return resolveServerEnvironment(request);
}

export function isConservativeBot(userAgent?: string | null) {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return false;
  return /(?:googlebot|bingbot|yandexbot|duckduckbot|baiduspider|gptbot|oai-searchbot|chatgpt-user|claudebot|anthropic-ai|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|uptimerobot|pingdom|statuscake|headlesschrome|python-requests|curl\/|wget\/|sqlmap|nikto)/.test(ua);
}

function serializeCookie(cookie: TrackingCookie, secure: boolean) {
  return `${cookie.name}=${cookie.value}; Path=/; Max-Age=${cookie.maxAge}; SameSite=Lax${cookie.httpOnly ? "; HttpOnly" : ""}${secure ? "; Secure" : ""}`;
}
