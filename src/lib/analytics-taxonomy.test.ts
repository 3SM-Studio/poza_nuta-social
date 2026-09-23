import { describe, expect, it } from "vitest";
import { acquisitionFromRequest, domainMatches, officialDestinationUrl, sanitizePath, sanitizeTaxonomyValue, trackingAcquisition } from "./analytics-taxonomy";

describe("analytics taxonomy", () => {
  it("classifies known domains without accepting lookalikes", () => {
    expect(acquisitionFromRequest({ referrer: "https://sub.instagram.com/reel" })).toMatchObject({ channelGroup: "organic_social", source: "instagram", medium: "social" });
    expect(acquisitionFromRequest({ referrer: "https://instagram.com.evil.example/" })).toMatchObject({ channelGroup: "referral", source: "instagram.com.evil.example" });
    expect(domainMatches("badinstagram.com", "instagram.com")).toBe(false);
  });
  it.each([
    ["https://chatgpt.com/", "ai_referral", "chatgpt", "referral"],
    ["https://chat.openai.com/c/abc", "ai_referral", "chatgpt", "referral"],
    ["https://www.google.com/search?q=poza+nuta", "organic_search", "google", "organic"],
    ["https://news.google.com/articles/x", "organic_search", "google", "organic"],
    ["https://facebook.com/poza.nuta", "organic_social", "facebook", "social"],
    ["https://tiktok.com/@poza.nuta", "organic_social", "tiktok", "social"],
  ])("classifies %s", (referrer, channelGroup, source, medium) => {
    expect(acquisitionFromRequest({ referrer })).toMatchObject({ channelGroup, source, medium });
  });
  it.each([
    ["https://instagram.com.evil.example/", "instagram.com.evil.example"],
    ["https://google.com.attacker.example/", "google.com.attacker.example"],
    ["https://chatgpt.com.fake.example/", "chatgpt.com.fake.example"],
  ])("does not trust lookalike %s", (referrer, source) => {
    expect(acquisitionFromRequest({ referrer })).toMatchObject({ channelGroup: "referral", source, medium: "referral" });
  });
  it("prefers sanitized UTM context and recognizes direct traffic", () => {
    expect(acquisitionFromRequest({ utmSource: "Instagram", utmMedium: "social", utmCampaign: "Autumn Launch" })).toMatchObject({ channelGroup: "organic_social", source: "instagram", medium: "social", campaign: "autumn-launch" });
    expect(acquisitionFromRequest({})).toMatchObject({ channelGroup: "direct", source: "direct", medium: null });
  });
  it("treats QR as a medium under the physical source", () => {
    expect(trackingAcquisition({ channelGroup: "offline", source: "poster", medium: "qr" })).toMatchObject({ channelGroup: "offline", source: "poster", medium: "qr" });
  });
  it("preserves referral participant identity only in owned tracking context", () => {
    expect(trackingAcquisition({
      channelGroup: "referral",
      source: "team",
      medium: "referral",
      referralParticipantId: "participant-1",
      trackingLinkId: "link-1",
    })).toMatchObject({ referralParticipantId: "participant-1", trackingLinkId: "link-1" });
    expect(acquisitionFromRequest({})).toMatchObject({ referralParticipantId: null });
  });
  it.each(["poster", "flyer", "table_stand"])("keeps %s as the offline source", (source) => {
    expect(trackingAcquisition({ channelGroup: "offline", source, medium: "qr" })).toMatchObject({ channelGroup: "offline", source, medium: "qr" });
  });
  it("bounds taxonomy and rejects obvious PII-like values", () => {
    expect(sanitizeTaxonomyValue("  Autumn Launch  ")).toBe("autumn-launch");
    expect(sanitizeTaxonomyValue("person@example.com")).toBeNull();
    expect(sanitizeTaxonomyValue("x".repeat(200), 64)).toHaveLength(64);
  });
  it("validates official destination domains", () => {
    expect(officialDestinationUrl("instagram", "https://www.instagram.com/poza.nuta/")).toContain("instagram.com");
    expect(officialDestinationUrl("instagram", "http://www.instagram.com/poza.nuta/")).toBeNull();
    expect(officialDestinationUrl("instagram", "https://instagram.com.evil.example/phish")).toBeNull();
    expect(officialDestinationUrl("website", "javascript:alert(1)")).toBeNull();
  });
  it.each(["/admin", "/api/track", "/auth/callback", "/go/instagram", "/r/ABCDE", "//evil.example", "/%2e%2e/admin", "/kontakt/../admin", "https://evil.example"])("rejects landing path %s", (path) => {
    expect(sanitizePath(path)).toBe("/");
  });
  it.each(["/", "/kontakt"])("allows public landing path %s", (path) => {
    expect(sanitizePath(path)).toBe(path);
  });
});
