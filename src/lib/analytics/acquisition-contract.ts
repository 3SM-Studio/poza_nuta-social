import type { ReportingScope } from "./reporting-scope";
import { EVENT_NAMES, type AnalyticsEventName } from "@/lib/analytics-taxonomy";

export type AcquisitionAssociation = "direct" | "persisted" | "none";
export type AcquisitionEventName = "tracking_entry" | "page_view" | "outbound_click" | "contact_view" | "contact_click" | "hub_resumed";
export type AcquisitionMetric = {
  kind: "campaign" | "asset" | "placement" | "link" | "destination";
  id: string;
  association: Exclude<AcquisitionAssociation, "none">;
  eventName: AcquisitionEventName;
  count: number;
};

export const ACQUISITION_EVENT_SOURCES = ["analytics_cookieless_events", "analytics_events_v2"] as const;
export const ACQUISITION_REPORTING_POPULATION = "Przyjęte zdarzenia w wybranym zakresie dat po canonical Reporting Scope (business albo diagnostic)";

export type AcquisitionCampaign = {
  id: string;
  name: string | null;
  status: "draft" | "active" | "archived" | null;
  directEvents: number;
  persistedEvents: number;
  trackingEntries: number;
  outboundClicks: number;
  contactClicks: number;
  contactViews: number;
};

export type AcquisitionOverview = {
  scope: ReportingScope;
  fromDate: string;
  toDateExclusive: string;
  totalEvents: number;
  directEvents: number;
  persistedEvents: number;
  noCampaignEvents: number;
  trackingEntries: number;
  outboundClicks: number;
  contactClicks: number;
  contactViews: number;
  campaignCount: number;
  campaigns: AcquisitionCampaign[];
};

export type AcquisitionDetail = {
  scope: ReportingScope;
  fromDate: string;
  toDateExclusive: string;
  campaign: { id: string; name: string; slug: string; status: string } | null;
  assets: Array<{ id: string; campaignId: string | null; label: string; slug: string; active: boolean }>;
  placements: Array<{ id: string; label: string; slug: string; type: string; active: boolean }>;
  links: Array<{ id: string; label: string; code: string; campaignId: string | null; assetId: string | null; placementId: string | null; distributionUnit: string | null; landingPath: string; active: boolean }>;
  destinations: Array<{ id: string; label: string; slug: string; active: boolean }>;
  metrics: AcquisitionMetric[];
};

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const sameUuid = (value: unknown, expected: string) => uuid(value) && uuid(expected) && value.toLowerCase() === expected.toLowerCase();
const text = (value: unknown): value is string => typeof value === "string";
const textOrNull = (value: unknown) => value === null || text(value);
const uuidOrNull = (value: unknown) => value === null || uuid(value);
const boolean = (value: unknown): value is boolean => typeof value === "boolean";
const fields = (value: Record<string, unknown>, names: readonly string[]) => names.every((name) => count(value[name]));
const matchesRequest = (value: Record<string, unknown>, scope: ReportingScope, fromDate: string, toDateExclusive: string) =>
  value.scope === scope && value.fromDate === fromDate && value.toDateExclusive === toDateExclusive;

export function isAcquisitionOverview(value: unknown, scope: ReportingScope, fromDate: string, toDateExclusive: string): value is AcquisitionOverview {
  if (!record(value) || !matchesRequest(value, scope, fromDate, toDateExclusive)
    || !fields(value, ["totalEvents", "directEvents", "persistedEvents", "noCampaignEvents", "trackingEntries", "outboundClicks", "contactClicks", "contactViews", "campaignCount"])
    || !Array.isArray(value.campaigns) || value.campaigns.length > 50 || value.campaigns.length > (value.campaignCount as number)
    || value.totalEvents !== (value.directEvents as number) + (value.persistedEvents as number) + (value.noCampaignEvents as number)) return false;
  return value.campaigns.every((campaign) => record(campaign) && uuid(campaign.id) && textOrNull(campaign.name)
    && (campaign.status === null || campaign.status === "draft" || campaign.status === "active" || campaign.status === "archived")
    && fields(campaign, ["directEvents", "persistedEvents", "trackingEntries", "outboundClicks", "contactClicks", "contactViews"]));
}

export function isAcquisitionDetail(value: unknown, scope: ReportingScope, fromDate: string, toDateExclusive: string, campaignId: string): value is AcquisitionDetail {
  if (!record(value) || !matchesRequest(value, scope, fromDate, toDateExclusive)) return false;
  if (value.campaign !== null && (!record(value.campaign) || !sameUuid(value.campaign.id, campaignId)
    || !text(value.campaign.name) || !text(value.campaign.slug)
    || !["draft", "active", "archived"].includes(value.campaign.status as string))) return false;
  if (!Array.isArray(value.assets) || !Array.isArray(value.placements) || !Array.isArray(value.links)
    || !Array.isArray(value.destinations) || !Array.isArray(value.metrics)) return false;
  return value.assets.every((item) => record(item) && uuid(item.id) && uuidOrNull(item.campaignId)
      && text(item.label) && text(item.slug) && boolean(item.active))
    && value.placements.every((item) => record(item) && uuid(item.id) && text(item.label)
      && text(item.slug) && text(item.type) && boolean(item.active))
    && value.links.every((item) => record(item) && uuid(item.id) && text(item.label) && text(item.code)
      && uuidOrNull(item.campaignId) && uuidOrNull(item.assetId) && uuidOrNull(item.placementId)
      && textOrNull(item.distributionUnit) && text(item.landingPath) && boolean(item.active))
    && value.destinations.every((item) => record(item) && uuid(item.id) && text(item.label)
      && text(item.slug) && boolean(item.active))
    && value.metrics.every((item) => record(item) && ["campaign", "asset", "placement", "link", "destination"].includes(item.kind as string)
      && uuid(item.id) && (item.kind !== "campaign" || sameUuid(item.id, campaignId))
      && (item.association === "direct" || item.association === "persisted")
      && EVENT_NAMES.includes(item.eventName as AnalyticsEventName)
      && count(item.count));
}

// The source is the two accepted primary event tables. Reporting eligibility is
// applied inside SQL before any metric is grouped or ranked.
export const ACQUISITION_METRICS = {
  trackingEntries: {
    label: "Wejścia przez link",
    population: "Przyjęte tracking_entry zapisane w wybranym okresie. Link i kampania pochodzą z użytego /r oraz identyfikatorów zdarzenia.",
    event: "tracking_entry",
    association: "direct",
    scope: ACQUISITION_REPORTING_POPULATION,
    sources: ACQUISITION_EVENT_SOURCES,
  },
  outboundClicks: {
    label: "Kliknięcia wychodzące",
    population: "Przyjęte outbound_click z /go. Kampania jest widoczna tylko wtedy, gdy samo zdarzenie ma jej bezpośredni lub utrwalony kontekst consented.",
    event: "outbound_click",
    association: "direct albo persisted",
    scope: ACQUISITION_REPORTING_POPULATION,
    sources: ACQUISITION_EVENT_SOURCES,
  },
  contactClicks: {
    label: "Kliknięcia kontaktu",
    population: "Przyjęte contact_click z własnym kontekstem kampanii. Brak kontekstu pozostaje poza wynikiem kampanii.",
    event: "contact_click",
    association: "direct albo persisted",
    scope: ACQUISITION_REPORTING_POPULATION,
    sources: ACQUISITION_EVENT_SOURCES,
  },
  contactViews: {
    label: "Widoki kontaktu",
    population: "Przyjęte contact_view z własnym kontekstem kampanii.",
    event: "contact_view",
    association: "direct albo persisted",
    scope: ACQUISITION_REPORTING_POPULATION,
    sources: ACQUISITION_EVENT_SOURCES,
  },
} as const;

export function acquisitionCount(metrics: AcquisitionMetric[], kind: AcquisitionMetric["kind"], id: string, eventName?: AcquisitionEventName, association?: AcquisitionMetric["association"]) {
  return metrics.reduce((total, row) => total + (row.kind === kind && row.id === id && (!eventName || row.eventName === eventName) && (!association || row.association === association) ? row.count : 0), 0);
}
