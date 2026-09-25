import "server-only";

import { ANALYTICS_PROJECT_KEY } from "@/lib/analytics-project";
import { isPublicPath } from "@/lib/public-paths";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleWithin } from "@/lib/async";
import type { AnalyticsMode } from "@/lib/analytics-mode";
import type { AnalyticsEventName } from "@/lib/analytics-taxonomy";

export const QUALITY_SURFACES = ["api_track", "tracking_redirect", "outbound_redirect"] as const;
export type QualitySurface = typeof QUALITY_SURFACES[number];
export type QualityReason =
  | "invalid_json" | "payload_too_large" | "forbidden_field" | "invalid_event"
  | "invalid_payload" | "invalid_event_id" | "invalid_path"
  | "idempotent_retry" | "unsupported_mode";
export type QualityOutcome = "rejected" | "duplicate" | "filtered";

type QualityException = {
  surface: QualitySurface;
  mode?: AnalyticsMode;
  eventName?: AnalyticsEventName;
  path?: string;
  outcome: QualityOutcome;
  reason: QualityReason;
};

// Only explicitly validated, bounded fields enter this function. No request body,
// request object, identity, user agent, referrer, or arbitrary details are accepted.
export async function recordQualityException(input: QualityException): Promise<void> {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    const write = admin.from("analytics_quality_exceptions").insert({
      project_key: ANALYTICS_PROJECT_KEY,
      surface: input.surface,
      mode: input.mode ?? null,
      event_name: input.eventName ?? null,
      path: input.path && isPublicPath(input.path) ? input.path : null,
      outcome: input.outcome,
      reason: input.reason,
    });
    const result = await settleWithin(Promise.resolve(write), 250, null);
    if (!result || result.error) {
      console.error("analytics quality write failed", { surface: input.surface, outcome: input.outcome, reason: input.reason });
    }
  } catch {
    console.error("analytics quality write failed", { surface: input.surface, outcome: input.outcome, reason: input.reason });
  }
}

export type DataQualityReport = {
  persistedTotal: number;
  persistedCookieless: number;
  persistedConsented: number;
  rejected: number;
  duplicates: number;
  filtered: number;
  contractDrift: number;
  rejectionReasons: Array<{ reason: string; count: number }>;
  eventNames: Array<{ eventName: string; count: number }>;
};

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function isDataQualityReport(value: unknown): value is DataQualityReport {
  if (!record(value) || !count(value.persistedTotal) || !count(value.persistedCookieless)
    || !count(value.persistedConsented) || !count(value.rejected) || !count(value.duplicates)
    || !count(value.filtered) || !count(value.contractDrift)
    || value.persistedTotal !== value.persistedCookieless + value.persistedConsented
    || !Array.isArray(value.rejectionReasons) || !Array.isArray(value.eventNames)) return false;
  if (!value.rejectionReasons.every((row: unknown) => record(row)
    && typeof row.reason === "string" && row.reason.trim().length > 0 && count(row.count))
    || !value.eventNames.every((row: unknown) => record(row)
      && typeof row.eventName === "string" && row.eventName.trim().length > 0 && count(row.count))) return false;
  return value.rejectionReasons.reduce((total, row) => total + row.count, 0) === value.rejected
    && value.eventNames.reduce((total, row) => total + row.count, 0) === value.persistedTotal;
}

export async function getDataQualityReport(from: string, toExclusive: string): Promise<DataQualityReport | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("analytics_data_quality_v1", {
    p_project_key: ANALYTICS_PROJECT_KEY,
    p_from_date: from,
    p_to_date_exclusive: toExclusive,
  });
  if (error || !isDataQualityReport(data)) {
    console.error("analytics data quality read failed", { reason: "report_unavailable" });
    return null;
  }
  return data;
}
