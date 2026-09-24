import { EVENT_NAMES, type AnalyticsEventName } from "@/lib/analytics-taxonomy";
import type { AnalyticsMode } from "@/lib/analytics-mode";
import type { ReportingScope } from "./reporting-scope";

export type EventSemanticCategory = "activity" | "acquisition" | "outcome" | "lifecycle";
export type EventSemantics = {
  eventName: AnalyticsEventName;
  label: string;
  meaning: string;
  category: EventSemanticCategory;
  isKeyEvent: boolean;
  isAcquisitionSignal: boolean;
  eligibleAsAttributionOutcome: boolean;
  modes: readonly AnalyticsMode[];
  countPopulation: string;
};

const BOTH = ["cookieless", "consented"] as const;
const EVENT_POPULATION = "Przyjęte zdarzenia o tej nazwie w wybranym okresie i Reporting Scope; każde wystąpienie liczy się osobno.";

// Event names are storage identity. Labels are presentation only.
export const EVENT_SEMANTICS = {
  page_view: { eventName: "page_view", label: "Wyświetlenia stron", meaning: "Otwarcie publicznej strony; sygnał aktywności, bez deklaracji zamiaru.", category: "activity", isKeyEvent: false, isAcquisitionSignal: false, eligibleAsAttributionOutcome: false, modes: BOTH, countPopulation: EVENT_POPULATION },
  tracking_entry: { eventName: "tracking_entry", label: "Wejścia przez link /r", meaning: "Użycie aktywnego linku /r; sygnał źródła wejścia, nie rezultat biznesowy.", category: "acquisition", isKeyEvent: false, isAcquisitionSignal: true, eligibleAsAttributionOutcome: false, modes: BOTH, countPopulation: EVENT_POPULATION },
  outbound_click: { eventName: "outbound_click", label: "Kliknięcia oficjalnych kanałów", meaning: "Wybór aktywnego oficjalnego celu przez /go przed przekierowaniem; zapis nie dowodzi dotarcia do celu.", category: "outcome", isKeyEvent: true, isAcquisitionSignal: false, eligibleAsAttributionOutcome: true, modes: BOTH, countPopulation: EVENT_POPULATION },
  contact_view: { eventName: "contact_view", label: "Widoki kontaktu", meaning: "Wyświetlenie strony /kontakt; krok pośredni, bez kliknięcia sposobu kontaktu.", category: "activity", isKeyEvent: false, isAcquisitionSignal: false, eligibleAsAttributionOutcome: false, modes: BOTH, countPopulation: EVENT_POPULATION },
  contact_click: { eventName: "contact_click", label: "Kliknięcia kontaktu", meaning: "Kliknięcie linku e-mail na /kontakt; zapis nie dowodzi wysłania wiadomości.", category: "outcome", isKeyEvent: true, isAcquisitionSignal: false, eligibleAsAttributionOutcome: true, modes: BOTH, countPopulation: EVENT_POPULATION },
  hub_resumed: { eventName: "hub_resumed", label: "Powroty po wyjściu", meaning: "Sygnał powrotu do strony po wcześniejszym wyborze /go; zdarzenie lifecycle, nie rezultat.", category: "lifecycle", isKeyEvent: false, isAcquisitionSignal: false, eligibleAsAttributionOutcome: false, modes: ["consented"], countPopulation: EVENT_POPULATION },
} as const satisfies Record<AnalyticsEventName, EventSemantics>;

export const KEY_EVENT_NAMES = EVENT_NAMES.filter((name) => EVENT_SEMANTICS[name].isKeyEvent);
export type KeyEventName = (typeof KEY_EVENT_NAMES)[number];

export const OUTCOME_METRICS = {
  acceptedEvents: { label: "Przyjęte zdarzenia", population: "Wystąpienia przyjętego zdarzenia o tej nazwie w wybranym okresie i zakresie ruchu.", source: "analytics_cookieless_events + analytics_events_v2 (schema_version = 1, analytics_consent = true)", modes: BOTH, limitation: "Liczba zdarzeń, nie osób ani sesji. Powtórzenia zwiększają wynik." },
  cookielessEvents: { label: "Cookieless", population: "Przyjęte zdarzenia cookieless tego outcome.", source: "analytics_cookieless_events", modes: ["cookieless"], limitation: "Bez tożsamości sesji; nie wyliczamy unikalnych użytkowników ani sesji." },
  consentedEvents: { label: "Consented", population: "Przyjęte zdarzenia z potwierdzoną zgodą tego outcome.", source: "analytics_events_v2", modes: ["consented"], limitation: "Liczba zdarzeń, nie osób; jedna sesja może mieć wiele zdarzeń." },
  consentedSessionsWithEvent: { label: "Sesje consented ze zdarzeniem", population: "Odrębne sesje z potwierdzoną zgodą, które miały co najmniej jedno takie zdarzenie w wybranym okresie i zakresie ruchu.", source: "analytics_events_v2", modes: ["consented"], limitation: "Tylko sesje consented; nie obejmuje cookieless i nie oznacza wszystkich użytkowników." },
} as const;

export type OutcomeRow = { eventName: KeyEventName; cookielessEvents: number; consentedEvents: number; acceptedEvents: number; consentedSessionsWithEvent: number };
export type OutcomeReport = { scope: ReportingScope; fromDate: string; toDateExclusive: string; outcomes: OutcomeRow[] };

export function isOutcomeReport(value: unknown, scope: ReportingScope, fromDate: string, toDateExclusive: string): value is OutcomeReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<OutcomeReport>;
  if (report.scope !== scope || report.fromDate !== fromDate || report.toDateExclusive !== toDateExclusive || !Array.isArray(report.outcomes) || report.outcomes.length !== KEY_EVENT_NAMES.length) return false;
  return KEY_EVENT_NAMES.every((name, index) => {
    const row = report.outcomes?.[index];
    return row?.eventName === name && count(row.cookielessEvents) && count(row.consentedEvents)
      && count(row.acceptedEvents) && count(row.consentedSessionsWithEvent)
      && row.acceptedEvents === row.cookielessEvents + row.consentedEvents
      && row.consentedSessionsWithEvent <= row.consentedEvents;
  });
}

function count(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
