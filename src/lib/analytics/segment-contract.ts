import { EVENT_SEMANTICS, KEY_EVENT_NAMES } from "./outcome-contract";
import type { ReportingScope } from "./reporting-scope";

export type SegmentDefinition = Readonly<{
  key: string;
  label: string;
  description: string;
  populationUnit: "consented_session";
  membership: string;
  requiredData: string;
  limitation: string;
}>;

// Keys are storage identity. Labels and descriptions are presentation only.
export const SEGMENT_DEFINITIONS = [
  { key: "key_events", label: "Sesje z Key Event", description: "Sesje z działaniem ważnym dla Poza Nutą.", populationUnit: "consented_session", membership: `Co najmniej jedno przyjęte zdarzenie ${KEY_EVENT_NAMES.join(" lub ")} w oknie i zakresie ruchu.`, requiredData: "Potwierdzona zgoda, session_id i canonical Key Event.", limitation: "Działanie nie potwierdza kontaktu, dotarcia do celu ani przypisania kampanii." },
  { key: "contact_click", label: "Sesje z kliknięciem kontaktu", description: "Sesje z próbą otwarcia kontaktu e-mail.", populationUnit: "consented_session", membership: `Co najmniej jedno przyjęte zdarzenie ${EVENT_SEMANTICS.contact_click.eventName} w oknie i zakresie ruchu.`, requiredData: "Potwierdzona zgoda, session_id i contact_click.", limitation: "Kliknięcie nie potwierdza wysłania wiadomości." },
  { key: "outbound_click", label: "Sesje z wyborem kanału", description: "Sesje z wyborem oficjalnej destynacji przez /go.", populationUnit: "consented_session", membership: `Co najmniej jedno przyjęte zdarzenie ${EVENT_SEMANTICS.outbound_click.eventName} w oknie i zakresie ruchu.`, requiredData: "Potwierdzona zgoda, session_id i outbound_click.", limitation: "Wybór nie potwierdza dotarcia do destynacji." },
  { key: "tracking_entry", label: "Sesje z wejściem /r", description: "Sesje z wejściem przez aktywny link śledzący.", populationUnit: "consented_session", membership: `Co najmniej jedno przyjęte zdarzenie ${EVENT_SEMANTICS.tracking_entry.eventName} w oknie i zakresie ruchu.`, requiredData: "Potwierdzona zgoda, session_id i tracking_entry.", limitation: "Wejście /r nie dowodzi skanowania QR; późniejszy kontekst pozyskania sam nie tworzy membership." },
] as const satisfies readonly SegmentDefinition[];

export type SegmentKey = (typeof SEGMENT_DEFINITIONS)[number]["key"];
export const DEFAULT_SEGMENT_KEY: SegmentKey = "key_events";
export function parseSegmentKey(value: unknown): SegmentKey | null {
  return typeof value === "string" && SEGMENT_DEFINITIONS.some((definition) => definition.key === value) ? value as SegmentKey : null;
}

export type SegmentCount = { key: SegmentKey; sessions: number };
export type SegmentSnapshot = {
  sessions: number;
  pageViews: number;
  contactClickEvents: number;
  outboundClickEvents: number;
  trackingEntries: number;
  sessionsWithKeyEvent: number;
};
export type SegmentReport = { scope: ReportingScope; fromDate: string; toDateExclusive: string; baseSessions: number; segments: SegmentCount[]; selectedKey: SegmentKey; selected: SegmentSnapshot };

export function shareOfBase(sessions: number, baseSessions: number): number | null {
  return baseSessions === 0 ? null : sessions / baseSessions;
}

export function isSegmentReport(value: unknown, scope: ReportingScope, fromDate: string, toDateExclusive: string, selectedKey: SegmentKey): value is SegmentReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<SegmentReport>;
  if (report.scope !== scope || report.fromDate !== fromDate || report.toDateExclusive !== toDateExclusive || report.selectedKey !== selectedKey || !count(report.baseSessions) || !Array.isArray(report.segments) || report.segments.length !== SEGMENT_DEFINITIONS.length) return false;
  if (!SEGMENT_DEFINITIONS.every((definition, index) => report.segments?.[index]?.key === definition.key && count(report.segments[index].sessions) && report.segments[index].sessions <= report.baseSessions!)) return false;
  const selected = report.selected;
  if (!selected || !count(selected.sessions) || selected.sessions !== report.segments.find((row) => row.key === selectedKey)?.sessions) return false;
  return count(selected.pageViews) && count(selected.contactClickEvents) && count(selected.outboundClickEvents) && count(selected.trackingEntries) && count(selected.sessionsWithKeyEvent) && selected.sessionsWithKeyEvent <= selected.sessions;
}

function count(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
