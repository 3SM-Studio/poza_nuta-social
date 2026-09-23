export const CHANNEL_GROUPS = ["direct", "offline", "ai_referral", "organic_search", "organic_social", "referral", "email", "paid_social", "paid_search", "other"] as const;
export const EVENT_NAMES = ["tracking_entry", "page_view", "outbound_click", "contact_view", "contact_click", "hub_resumed"] as const;
export const TRAFFIC_CLASSES = ["external", "internal", "test", "bot"] as const;
export const ANALYTICS_ENVIRONMENTS = ["production", "staging", "preview", "development"] as const;

export type ChannelGroup = typeof CHANNEL_GROUPS[number];
export type AnalyticsEventName = typeof EVENT_NAMES[number];
export type TrafficClass = typeof TRAFFIC_CLASSES[number];
export type AnalyticsEnvironment = typeof ANALYTICS_ENVIRONMENTS[number];

export type AcquisitionContext = {
  channelGroup: ChannelGroup;
  source: string;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  referrerHost: string | null;
  trackingLinkId: string | null;
  campaignId: string | null;
  assetId: string | null;
  placementId: string | null;
  referralParticipantId: string | null;
};

const KNOWN_REFERRERS: Array<{ domains: string[]; channelGroup: ChannelGroup; source: string; medium: string }> = [
  { domains: ["chatgpt.com", "chat.openai.com"], channelGroup: "ai_referral", source: "chatgpt", medium: "referral" },
  { domains: ["google.com", "google.pl"], channelGroup: "organic_search", source: "google", medium: "organic" },
  { domains: ["bing.com"], channelGroup: "organic_search", source: "bing", medium: "organic" },
  { domains: ["instagram.com"], channelGroup: "organic_social", source: "instagram", medium: "social" },
  { domains: ["facebook.com", "fb.com", "l.facebook.com"], channelGroup: "organic_social", source: "facebook", medium: "social" },
  { domains: ["tiktok.com"], channelGroup: "organic_social", source: "tiktok", medium: "social" },
  { domains: ["youtube.com", "youtu.be"], channelGroup: "organic_social", source: "youtube", medium: "social" },
];

const UTM_SOURCE_MAP: Record<string, { channelGroup: ChannelGroup; source: string; defaultMedium: string }> = {
  chatgpt: { channelGroup: "ai_referral", source: "chatgpt", defaultMedium: "referral" },
  google: { channelGroup: "organic_search", source: "google", defaultMedium: "organic" },
  instagram: { channelGroup: "organic_social", source: "instagram", defaultMedium: "social" },
  facebook: { channelGroup: "organic_social", source: "facebook", defaultMedium: "social" },
  tiktok: { channelGroup: "organic_social", source: "tiktok", defaultMedium: "social" },
  newsletter: { channelGroup: "email", source: "newsletter", defaultMedium: "email" },
};

export const DIRECT_ACQUISITION: AcquisitionContext = {
  channelGroup: "direct", source: "direct", medium: null, campaign: null, content: null,
  referrerHost: null, trackingLinkId: null, campaignId: null, assetId: null, placementId: null,
  referralParticipantId: null,
};

export function acquisitionFromRequest(input: {
  ownHost?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
}): AcquisitionContext {
  const source = sanitizeTaxonomyValue(input.utmSource, 64);
  const medium = sanitizeTaxonomyValue(input.utmMedium, 64);
  if (source) {
    const known = UTM_SOURCE_MAP[source];
    return {
      ...DIRECT_ACQUISITION,
      channelGroup: known?.channelGroup || channelFromMedium(medium),
      source: known?.source || source,
      medium: medium || known?.defaultMedium || "campaign",
      campaign: sanitizeTaxonomyValue(input.utmCampaign, 96),
      content: sanitizeTaxonomyValue(input.utmContent, 96),
    };
  }

  const referrerHost = normalizedHost(input.referrer);
  const ownHost = normalizedHost(input.ownHost, true);
  if (!referrerHost || (ownHost && domainMatches(referrerHost, ownHost))) return DIRECT_ACQUISITION;
  const known = KNOWN_REFERRERS.find((item) => item.domains.some((domain) => domainMatches(referrerHost, domain)));
  return {
    ...DIRECT_ACQUISITION,
    channelGroup: known?.channelGroup || "referral",
    source: known?.source || referrerHost,
    medium: known?.medium || "referral",
    referrerHost,
  };
}

export function trackingAcquisition(input: {
  channelGroup?: string | null; source?: string | null; medium?: string | null; campaign?: string | null;
  trackingLinkId?: string | null; campaignId?: string | null; assetId?: string | null; placementId?: string | null;
  referralParticipantId?: string | null;
}): AcquisitionContext {
  const channelGroup = CHANNEL_GROUPS.includes(input.channelGroup as ChannelGroup) ? input.channelGroup as ChannelGroup : "other";
  return {
    ...DIRECT_ACQUISITION,
    channelGroup,
    source: sanitizeTaxonomyValue(input.source, 64) || "unknown",
    medium: sanitizeTaxonomyValue(input.medium, 64),
    campaign: sanitizeTaxonomyValue(input.campaign, 96),
    trackingLinkId: input.trackingLinkId || null,
    campaignId: input.campaignId || null,
    assetId: input.assetId || null,
    placementId: input.placementId || null,
    referralParticipantId: input.referralParticipantId || null,
  };
}

export function sanitizeTaxonomyValue(value?: string | null, limit = 96) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().normalize("NFKC");
  if (!normalized || /[@<>\r\n]/.test(normalized)) return null;
  return normalized.replace(/[^a-z0-9._:/+-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, limit) || null;
}

export function sanitizePath(value?: string | null) {
  return value === "/kontakt" ? "/kontakt" : "/";
}

export function normalizedHost(value?: string | null, hostOnly = false) {
  if (!value) return null;
  try {
    const host = (hostOnly ? value : new URL(value).hostname).toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    return /^[a-z0-9.-]{1,253}$/.test(host) ? host : null;
  } catch {
    if (!hostOnly) return null;
    const host = value.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    return /^[a-z0-9.-]{1,253}$/.test(host) ? host : null;
  }
}

export function domainMatches(host: string, domain: string) {
  const normalized = host.toLowerCase();
  const expected = domain.toLowerCase();
  return normalized === expected || normalized.endsWith(`.${expected}`);
}

export function officialDestinationUrl(slug: string, value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = normalizedHost(url.hostname, true);
    if (!host) return null;
    const domains: Record<string, string[]> = {
      instagram: ["instagram.com"], tiktok: ["tiktok.com"], facebook: ["facebook.com", "fb.com"],
      youtube: ["youtube.com", "youtu.be"], website: ["pozanuta.pl"],
    };
    return domains[slug]?.some((domain) => domainMatches(host, domain)) ? url.toString() : null;
  } catch {
    return null;
  }
}

function channelFromMedium(medium: string | null): ChannelGroup {
  if (medium === "qr") return "offline";
  if (medium === "social") return "organic_social";
  if (medium === "organic") return "organic_search";
  if (medium === "email") return "email";
  if (medium === "cpc" || medium === "ppc") return "paid_search";
  return "other";
}
