import { KEY_EVENT_NAMES, type KeyEventName } from "./outcome-contract";
import type { AnalyticsMode } from "@/lib/analytics-mode";
import type { ReportingScope } from "./reporting-scope";

export const ATTRIBUTION_BASES = ["direct_observed", "persisted_consented", "unattributed"] as const;
export type AttributionBasis = typeof ATTRIBUTION_BASES[number];
export type AttributionSplit = { eventName: KeyEventName; mode: AnalyticsMode; basis: AttributionBasis; events: number };
export type CampaignCredit = { id: string; name: string | null; status: string | null; events: number; outcomes: Array<{ eventName: KeyEventName; basis: Exclude<AttributionBasis, "unattributed">; events: number }> };
export type GraphCredit = { entityType: "asset" | "placement" | "tracking_link"; id: string; campaignId: string | null; label: string | null; eventName: KeyEventName; basis: Exclude<AttributionBasis, "unattributed">; events: number };
export type AttributionReport = {
  scope: ReportingScope;
  fromDate: string;
  toDateExclusive: string;
  summary: {
    total: number; attributed: number; unattributed: number;
    directObserved: number; persistedConsented: number;
    campaignAttributed: number; partialContext: number;
    consentedSessionsWithAttributedOutcome: number;
    coverage: number | null;
  };
  splits: AttributionSplit[];
  campaigns: CampaignCredit[];
  campaignRows: number;
  graph: GraphCredit[];
  graphRows: number;
};

const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const keyEvent = (value: unknown): value is KeyEventName => KEY_EVENT_NAMES.some((name) => name === value);
const credited = (value: unknown) => value === "direct_observed" || value === "persisted_consented";
const textOrNull = (value: unknown) => value === null || typeof value === "string";

export function isAttributionReport(value: unknown, scope: ReportingScope, fromDate: string, toDateExclusive: string): value is AttributionReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<AttributionReport>;
  if (report.scope !== scope || report.fromDate !== fromDate || report.toDateExclusive !== toDateExclusive) return false;
  const s = report.summary;
  if (!s || ![s.total,s.attributed,s.unattributed,s.directObserved,s.persistedConsented,s.campaignAttributed,s.partialContext,s.consentedSessionsWithAttributedOutcome,s.campaignAttributed].every(count)
    || s.total !== s.attributed + s.unattributed
    || s.attributed !== s.directObserved + s.persistedConsented
    || s.attributed !== s.campaignAttributed + s.partialContext
    || (s.total === 0 ? s.coverage !== null : typeof s.coverage !== "number" || !Number.isFinite(s.coverage) || s.coverage < 0 || s.coverage > 1)) return false;
  if (!Array.isArray(report.splits) || !Array.isArray(report.campaigns) || !Array.isArray(report.graph)
    || !count(report.campaignRows) || !count(report.graphRows)
    || report.campaigns.length > 100 || report.graph.length > 100) return false;
  if (!report.splits.every((r) => keyEvent(r.eventName) && (r.mode === "cookieless" || r.mode === "consented")
    && ATTRIBUTION_BASES.some((basis) => basis === r.basis) && count(r.events)
    && !(r.mode === "cookieless" && r.basis === "persisted_consented"))) return false;
  if (report.splits.reduce((sum, r) => sum + r.events, 0) !== s.total) return false;
  if (!report.campaigns.every((r) => uuid(r.id) && textOrNull(r.name) && textOrNull(r.status) && count(r.events)
    && Array.isArray(r.outcomes) && r.outcomes.every((outcome) => keyEvent(outcome.eventName) && credited(outcome.basis) && count(outcome.events))
    && r.outcomes.reduce((sum, outcome) => sum + outcome.events, 0) === r.events)) return false;
  return report.graph.every((r) => (r.entityType === "asset" || r.entityType === "placement" || r.entityType === "tracking_link")
    && uuid(r.id) && (r.campaignId === null || uuid(r.campaignId)) && textOrNull(r.label)
    && keyEvent(r.eventName) && credited(r.basis) && count(r.events));
}
