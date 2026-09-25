import { dashboardRangeDays, isValidDashboardDate, resolveDashboardRange, type DashboardRange } from "@/lib/dashboard-range";
import { DEFAULT_REPORTING_SCOPE, parseReportingScope, type ReportingScope } from "./reporting-scope";

type SearchParams = Record<string, string | string[] | undefined>;
type QuickRangeKey = Exclude<DashboardRange["key"], "custom">;

export type AnalyticsReportRequest = {
  range: DashboardRange;
  scope: ReportingScope;
  status: "valid" | "invalid" | "too_long";
  custom: {
    from: string;
    to: string;
    invalidFrom: boolean;
    invalidTo: boolean;
    reversed: boolean;
  };
};

// The dashboard range owns Warsaw calendar dates and the 30-day fallback.
// These report RPCs share a 366-day request limit; SQL still owns event-time filtering.
export function resolveAnalyticsReportRequest(params: SearchParams, now = new Date()): AnalyticsReportRequest {
  const range = resolveDashboardRange(params, now);
  const scope = parseReportingScope(typeof params.scope === "string" ? params.scope : null) ?? DEFAULT_REPORTING_SCOPE;
  const customRequested = params.range === "custom";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";
  const invalidFrom = customRequested && !isValidDashboardDate(params.from);
  const invalidTo = customRequested && !isValidDashboardDate(params.to);
  const reversed = customRequested && !invalidFrom && !invalidTo && from > to;
  const status = customRequested && range.key !== "custom" ? "invalid"
    : dashboardRangeDays(range) > 366 ? "too_long" : "valid";

  return { range, scope, status, custom: { from, to, invalidFrom, invalidTo, reversed } };
}

export function analyticsReportQuery(
  range: DashboardRange,
  scope: ReportingScope,
  options: { rangeKey?: QuickRangeKey; extra?: Record<string, string> } = {},
): string {
  const key = options.rangeKey ?? range.key;
  const query = new URLSearchParams(options.extra);
  query.set("range", key);
  if (key === "custom") { query.set("from", range.from); query.set("to", range.toInclusive); }
  else { query.delete("from"); query.delete("to"); }
  if (scope === "diagnostic") query.set("scope", scope);
  else query.delete("scope");
  return query.toString();
}
