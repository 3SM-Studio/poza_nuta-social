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
  rejectionReasons: Array<{ reason: QualityReason; count: number }>;
  eventNames: Array<{ eventName: AnalyticsEventName; count: number }>;
};

export async function getDataQualityReport(from: string, toExclusive: string): Promise<DataQualityReport | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("analytics_data_quality_v1", {
    p_project_key: ANALYTICS_PROJECT_KEY,
    p_from_date: from,
    p_to_date_exclusive: toExclusive,
  });
  if (error || !data || typeof data !== "object") {
    console.error("analytics data quality read failed", { reason: "report_unavailable" });
    return null;
  }
  return data as DataQualityReport;
}
