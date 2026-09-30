// The SQL predicate analytics_reporting_eligible_v1 owns row eligibility.
// This closed server contract only names the selectable reporting populations.
export const REPORTING_SCOPES = ["business", "diagnostic"] as const;
export type ReportingScope = typeof REPORTING_SCOPES[number];
export const DEFAULT_REPORTING_SCOPE: ReportingScope = "business";

export const REPORTING_SCOPE_LABELS: Record<ReportingScope, string> = {
  business: "Ruch biznesowy",
  diagnostic: "Diagnostyka: wszystkie przyjęte zdarzenia",
};

export function parseReportingScope(value: string | null): ReportingScope | null {
  return REPORTING_SCOPES.includes(value as ReportingScope) ? value as ReportingScope : null;
}
