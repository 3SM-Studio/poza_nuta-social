import type { ReportingScope } from "./reporting-scope";

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
