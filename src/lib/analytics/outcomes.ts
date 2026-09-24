import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ANALYTICS_PROJECT_KEY } from "@/lib/analytics-project";
import { isOutcomeReport, type OutcomeReport } from "./outcome-contract";
import type { ReportingScope } from "./reporting-scope";

export async function getOutcomeReport(fromDate: string, toDateExclusive: string, scope: ReportingScope): Promise<OutcomeReport | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("analytics_key_events_v1", {
    p_project_key: ANALYTICS_PROJECT_KEY,
    p_from_date: fromDate,
    p_to_date_exclusive: toDateExclusive,
    p_scope: scope,
  });
  if (error || !isOutcomeReport(data, scope, fromDate, toDateExclusive)) {
    console.error("analytics key events read failed", { reason: "report_unavailable" });
    return null;
  }
  return data;
}
