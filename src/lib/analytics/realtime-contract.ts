import { EVENT_NAMES, type AnalyticsEventName } from "@/lib/analytics-taxonomy";
import { REPORTING_SCOPE_LABELS, type ReportingScope } from "./reporting-scope";

export const REALTIME_WINDOWS = [5, 30, 60] as const;
export type RealtimeWindow = typeof REALTIME_WINDOWS[number];

export function parseRealtimeWindow(value: string | null): RealtimeWindow | null {
  const number = Number(value);
  return REALTIME_WINDOWS.includes(number as RealtimeWindow) && value === String(number)
    ? number as RealtimeWindow : null;
}

export const REALTIME_METRICS = {
  events: {
    key: "events", label: "Zdarzenia", population: "Wszystkie zaakceptowane zdarzenia",
    source: "analytics_cookieless_events + analytics_events_v2 (analytics_consent = true)",
    explanation: "Każde przyjęte zdarzenie w ruchomym oknie. Obejmuje oba tryby; odrzucone próby i duplikaty są liczone osobno w Data Quality.",
  },
  pageViews: {
    key: "pageViews", label: "Odsłony stron", population: "Oba tryby",
    source: "event_name = page_view", explanation: "Wyświetlenia publicznych stron zapisane w wybranym oknie.",
  },
  trackingEntries: {
    key: "trackingEntries", label: "Wejścia przez linki", population: "Oba tryby",
    source: "event_name = tracking_entry", explanation: "Wejścia przez linki śledzące /r zapisane w wybranym oknie.",
  },
  outboundClicks: {
    key: "outboundClicks", label: "Kliknięcia wychodzące", population: "Oba tryby",
    source: "event_name = outbound_click", explanation: "Wybory destynacji przez /go zapisane w wybranym oknie.",
  },
  contactViews: {
    key: "contactViews", label: "Widoki kontaktu", population: "Oba tryby",
    source: "event_name = contact_view", explanation: "Zapisane wyświetlenia kontaktu; nie są liczbą osób.",
  },
  contactClicks: {
    key: "contactClicks", label: "Kliknięcia kontaktu", population: "Oba tryby",
    source: "event_name = contact_click", explanation: "Zapisane kliknięcia kanału kontaktu; nie są liczbą osób.",
  },
  consentedSessionsWithActivity: {
    key: "consentedSessionsWithActivity", label: "Sesje consented z aktywnością", population: "Wyłącznie consented",
    source: "DISTINCT session_id w zaakceptowanych analytics_events_v2 wewnątrz okna",
    explanation: "Sesje consented z co najmniej jednym zapisanym zdarzeniem w wybranym oknie. Nie oznacza osób online ani aktualnie otwartych kart.",
  },
} as const;

export function realtimeMetricPopulation(key: keyof typeof REALTIME_METRICS, scope: ReportingScope): string {
  return `${REALTIME_METRICS[key].population}; ${REPORTING_SCOPE_LABELS[scope].toLowerCase()} w wybranym oknie`;
}

export type RealtimeReport = {
  scope: ReportingScope;
  windowStart: string;
  windowEnd: string;
  refreshedAt: string;
  totalEvents: number;
  cookielessEvents: number;
  consentedEvents: number;
  consentedSessionsWithActivity: number;
  eventCounts: Partial<Record<AnalyticsEventName, number>>;
  topPages: Array<{ label: string; count: number }>;
  observedSources: Array<{ label: string; count: number; mode: "cookieless" | "consented"; kind: "utm_source" | "referrer_host" | "observed_context" }>;
  topCampaigns: Array<{ label: string; count: number }>;
  topTrackingLinks: Array<{ label: string; count: number }>;
  topDestinations: Array<{ label: string; count: number }>;
  qualityExceptions: number;
};

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const ranking = (value: unknown) => Array.isArray(value) && value.length <= 5 && value.every((row) =>
  record(row) && typeof row.label === "string" && count(row.count));

export function isRealtimeReport(value: unknown, scope: ReportingScope, minutes: RealtimeWindow, now: Date): value is RealtimeReport {
  if (!record(value) || value.scope !== scope || typeof value.windowStart !== "string"
    || typeof value.windowEnd !== "string" || typeof value.refreshedAt !== "string") return false;
  const start = Date.parse(value.windowStart);
  const end = Date.parse(value.windowEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end !== now.getTime() || end - start !== minutes * 60_000
    || Date.parse(value.refreshedAt) !== end) return false;
  if (!count(value.totalEvents) || !count(value.cookielessEvents) || !count(value.consentedEvents)
    || !count(value.consentedSessionsWithActivity) || !count(value.qualityExceptions)
    || value.totalEvents !== value.cookielessEvents + value.consentedEvents
    || value.consentedSessionsWithActivity > value.consentedEvents || !record(value.eventCounts)) return false;
  const eventCounts = Object.entries(value.eventCounts);
  if (!eventCounts.every(([name, events]) => EVENT_NAMES.includes(name as AnalyticsEventName) && count(events))
    || eventCounts.reduce((total, [, events]) => total + (events as number), 0) !== value.totalEvents) return false;
  return ranking(value.topPages) && ranking(value.topCampaigns) && ranking(value.topTrackingLinks)
    && ranking(value.topDestinations) && Array.isArray(value.observedSources) && value.observedSources.length <= 5
    && value.observedSources.every((row) => record(row) && typeof row.label === "string" && count(row.count)
      && (row.mode === "cookieless" || row.mode === "consented")
      && (row.kind === "utm_source" || row.kind === "referrer_host" || row.kind === "observed_context"));
}

export function realtimeMetricValue(report: RealtimeReport, key: keyof typeof REALTIME_METRICS): number {
  if (key === "events") return report.totalEvents;
  if (key === "consentedSessionsWithActivity") return report.consentedSessionsWithActivity;
  const names: Record<Exclude<keyof typeof REALTIME_METRICS, "events" | "consentedSessionsWithActivity">, AnalyticsEventName> = {
    pageViews: "page_view", trackingEntries: "tracking_entry", outboundClicks: "outbound_click",
    contactViews: "contact_view", contactClicks: "contact_click",
  };
  return report.eventCounts[names[key]] ?? 0;
}

export function realtimeModeShare(count: number, total: number): string {
  return total === 0 ? "—" : `${Math.round(count / total * 100)}%`;
}
