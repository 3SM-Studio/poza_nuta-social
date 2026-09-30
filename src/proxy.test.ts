import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { signAnalyticsToken, verifyAnalyticsToken } from "@/lib/analytics-token";
import { DIRECT_ACQUISITION } from "@/lib/analytics-taxonomy";
import { buildTrackingContext } from "@/lib/tracking-context";
import { proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());

describe("Preview proxy identity", () => {
  it("preserves a Preview session and binds refreshed tokens to Preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const exp = Math.floor(Date.now() / 1000) + 60;
    const sessionId = crypto.randomUUID();
    const consent = await signAnalyticsToken("consent", { analytics: true, marketing: false, version: 2, environment: "preview", exp });
    const session = await signAnalyticsToken("session", { id: sessionId, environment: "preview", exp });
    const request = new NextRequest("https://preview.example/?utm_source=instagram", {
      headers: { cookie: `pn_consent=${consent}; pn_session=${session}` },
    });

    const response = await proxy(request);
    const refreshed = await verifyAnalyticsToken<{ id: string; environment: string; exp: number }>("session", response.cookies.get("pn_session")?.value);
    const acquisition = await verifyAnalyticsToken<{ environment: string; exp: number }>("acquisition", response.cookies.get("pn_acquisition")?.value);

    expect(refreshed).toMatchObject({ id: sessionId, environment: "preview" });
    expect(acquisition?.environment).toBe("preview");
    expect((await buildTrackingContext(request)).context.identity.sessionId).toBe(sessionId);
  });

  it("replaces a legacy unbound session on Preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const exp = Math.floor(Date.now() / 1000) + 60;
    const legacyId = crypto.randomUUID();
    const consent = await signAnalyticsToken("consent", { analytics: true, marketing: false, version: 2, environment: "preview", exp });
    const legacySession = await signAnalyticsToken("session", { id: legacyId, exp });
    const request = new NextRequest("https://preview.example/karaoke", {
      headers: { cookie: `pn_consent=${consent}; pn_session=${legacySession}` },
    });

    const response = await proxy(request);
    const refreshed = await verifyAnalyticsToken<{ id: string; environment: string; exp: number }>("session", response.cookies.get("pn_session")?.value);

    expect(refreshed?.environment).toBe("preview");
    expect(refreshed?.id).not.toBe(legacyId);
    expect((await buildTrackingContext(request)).context.identity.sessionId).toBe(refreshed?.id);
  });

  it.each([
    ["preview", "https://preview.example"],
    ["production", "https://pozanuta.pl"],
    ["development", "http://localhost:3000"],
  ] as const)("keeps one %s session through three tracked requests", async (environment, origin) => {
    vi.stubEnv("VERCEL_ENV", environment);
    const exp = Math.floor(Date.now() / 1000) + 60;
    const consent = await signAnalyticsToken("consent", { analytics: true, marketing: false, version: 2, environment, exp });
    const originalSession = crypto.randomUUID();
    let session = await signAnalyticsToken("session", { id: originalSession, environment, exp });

    for (const path of ["/", "/karaoke", "/linki"]) {
      const request = new NextRequest(`${origin}${path}`, { headers: { cookie: `pn_consent=${consent}; pn_session=${session}` } });
      const response = await proxy(request);
      const context = (await buildTrackingContext(request)).context;
      const refreshed = await verifyAnalyticsToken<{ id: string; environment: string; exp: number }>("session", response.cookies.get("pn_session")?.value);
      expect(context.identity.sessionId).toBe(originalSession);
      expect(context.environment).toBe(environment);
      expect(refreshed).toMatchObject({ id: originalSession, environment });
      session = response.cookies.get("pn_session")!.value;
    }
  });

  it("uses the runtime environment when a browser supplies a token from another environment", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const exp = Math.floor(Date.now() / 1000) + 60;
    const consent = await signAnalyticsToken("consent", { analytics: true, marketing: false, version: 2, environment: "preview", exp });
    const foreignSessionId = crypto.randomUUID();
    const foreignSession = await signAnalyticsToken("session", { id: foreignSessionId, environment: "production", exp });
    const foreignAcquisition = await signAnalyticsToken("acquisition", { acquisition: { ...DIRECT_ACQUISITION, source: "facebook", channelGroup: "organic_social" }, environment: "production", exp });
    const request = new NextRequest("https://preview.example/?utm_source=instagram&environment=production", {
      headers: { cookie: `pn_consent=${consent}; pn_session=${foreignSession}; pn_acquisition=${foreignAcquisition}`, "x-environment": "production" },
    });
    const response = await proxy(request);
    const context = (await buildTrackingContext(request)).context;
    const session = await verifyAnalyticsToken<{ id: string; environment: string; exp: number }>("session", response.cookies.get("pn_session")?.value);
    const acquisition = await verifyAnalyticsToken<{ acquisition: { source: string }; environment: string; exp: number }>("acquisition", response.cookies.get("pn_acquisition")?.value);

    expect(session?.environment).toBe("preview");
    expect(session?.id).not.toBe(foreignSessionId);
    expect(acquisition).toMatchObject({ environment: "preview", acquisition: { source: "instagram" } });
    expect(context.environment).toBe("preview");
    expect(context.attributionCandidate.source).toBe("instagram");
  });

  it("keeps the first eligible non-direct acquisition across direct and later campaign pages", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const exp = Math.floor(Date.now() / 1000) + 60;
    const consent = await signAnalyticsToken("consent", { analytics: true, marketing: false, version: 2, environment: "preview", exp });
    const session = await signAnalyticsToken("session", { id: crypto.randomUUID(), environment: "preview", exp });
    const landing = new NextRequest("https://preview.example/?utm_source=instagram", { headers: { cookie: `pn_consent=${consent}; pn_session=${session}` } });
    const firstResponse = await proxy(landing);
    const original = firstResponse.cookies.get("pn_acquisition")!.value;

    const direct = new NextRequest("https://preview.example/karaoke", { headers: { cookie: `pn_consent=${consent}; pn_session=${session}; pn_acquisition=${original}` } });
    const directResponse = await proxy(direct);
    expect(directResponse.cookies.get("pn_acquisition")).toBeUndefined();
    expect((await buildTrackingContext(direct)).context.attributionCandidate.source).toBe("instagram");

    const laterCampaign = new NextRequest("https://preview.example/kontakt?utm_source=facebook", { headers: { cookie: `pn_consent=${consent}; pn_session=${session}; pn_acquisition=${original}` } });
    const laterResponse = await proxy(laterCampaign);
    const oldContext = await verifyAnalyticsToken<{ acquisition: { source: string }; environment: string; exp: number }>("acquisition", original);
    expect(oldContext).toMatchObject({ environment: "preview", acquisition: { source: "instagram" } });
    expect(laterResponse.cookies.get("pn_acquisition")).toBeUndefined();
  });
});
