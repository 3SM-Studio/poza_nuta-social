import { type ReportingScope } from "./reporting-scope";

export const FUNNELS = {
  contact_intent: {
    key: "contact_intent",
    label: "Kontakt",
    description: "Od wyświetlenia strony kontaktu do kliknięcia sposobu kontaktu.",
    steps: [
      { key: "contact_view", label: "Wyświetlenie kontaktu", eventName: "contact_view" },
      { key: "contact_click", label: "Kliknięcie kontaktu", eventName: "contact_click" },
    ],
  },
  tracked_entry_to_contact: {
    key: "tracked_entry_to_contact",
    label: "Wejście przez link → kontakt",
    description: "Od wejścia przez aktywny link /r do wyświetlenia i kliknięcia kontaktu w tej samej sesji. Nie jest to analiza przypisania do kampanii.",
    steps: [
      { key: "tracking_entry", label: "Wejście przez link", eventName: "tracking_entry" },
      { key: "contact_view", label: "Wyświetlenie kontaktu", eventName: "contact_view" },
      { key: "contact_click", label: "Kliknięcie kontaktu", eventName: "contact_click" },
    ],
  },
} as const;

export type FunnelKey = keyof typeof FUNNELS;
export const DEFAULT_FUNNEL: FunnelKey = "contact_intent";

export function parseFunnelKey(value: string | null): FunnelKey | null {
  return value !== null && Object.hasOwn(FUNNELS, value) ? value as FunnelKey : null;
}

export type FunnelStepResult = {
  key: string;
  sessions: number;
  previousSessions: number | null;
  conversionRate: number | null;
  dropOff: number | null;
  dropOffRate: number | null;
};

export type FunnelReport = {
  funnelKey: FunnelKey;
  scope: ReportingScope;
  fromDate: string;
  toDateExclusive: string;
  eligibleSessions: number;
  entrants: number;
  completionRate: number | null;
  steps: FunnelStepResult[];
};

export function isFunnelReport(value: unknown, key: FunnelKey, scope: ReportingScope): value is FunnelReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<FunnelReport>;
  if (report.funnelKey !== key || report.scope !== scope || !Array.isArray(report.steps)
    || report.steps.length !== FUNNELS[key].steps.length || !nonnegative(report.eligibleSessions)
    || !nonnegative(report.entrants) || !rateOrNull(report.completionRate)) return false;
  return report.steps.every((step, index) => step.key === FUNNELS[key].steps[index].key
    && nonnegative(step.sessions) && (step.previousSessions === null || nonnegative(step.previousSessions))
    && (step.dropOff === null || nonnegative(step.dropOff))
    && rateOrNull(step.conversionRate) && rateOrNull(step.dropOffRate));
}

function nonnegative(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
function rateOrNull(value: unknown): value is number | null { return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100); }
