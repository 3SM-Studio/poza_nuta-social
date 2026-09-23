import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { signAnalyticsToken } from "./analytics-token";
import { buildTrackingContext, isConservativeBot } from "./tracking-context";

describe("traffic classification", () => {
  it.each([
    "Mozilla/5.0 (compatible; Googlebot/2.1)", "Mozilla/5.0 (compatible; bingbot/2.0)",
    "GPTBot/1.2", "OAI-SearchBot/1.0", "facebookexternalhit/1.1", "TelegramBot (like TwitterBot)",
    "Discordbot/2.0", "Slackbot-LinkExpanding 1.0", "sqlmap/1.8", "curl/8.5.0",
  ])("recognizes bot/preview UA %s", (ua) => expect(isConservativeBot(ua)).toBe(true));
  it.each([
    "Mozilla/5.0 Chrome/153 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
    "", "DefinitelyUnknownAutomation/1.0",
  ])("does not overclaim unknown/ordinary UA %s", (ua) => expect(isConservativeBot(ua)).toBe(false));

  it("rejects forged classification markers and honors signed precedence", async () => {
    const forged = new NextRequest("http://localhost/?traffic_class=test&environment=production", { headers: { cookie: "pn_internal=forged; pn_analytics_test=forged", "user-agent": "Chrome/153" } });
    expect((await buildTrackingContext(forged)).context).toMatchObject({ environment: "development", trafficClass: "external" });

    const exp = Math.floor(Date.now() / 1000) + 60;
    const internal = await signAnalyticsToken("internal", { enabled: true as const, exp });
    const test = await signAnalyticsToken("test", { enabled: true as const, exp });
    const signed = new NextRequest("http://localhost/", { headers: { cookie: `pn_internal=${internal}; pn_analytics_test=${test}`, "user-agent": "Googlebot/2.1" } });
    expect((await buildTrackingContext(signed)).context.trafficClass).toBe("test");
  });

  it("does not accept a forged consent or visitor identity", async () => {
    const request = new NextRequest("http://localhost/", { headers: { cookie: "pn_consent=forged; pn_visitor=67a593f7-55d4-4dc5-b720-cf9ccdf09c9c" } });
    const { context } = await buildTrackingContext(request);
    expect(context.consent).toEqual({ analytics: false, marketing: false });
    expect(context.identity.visitorId).toBeNull();
  });
});
