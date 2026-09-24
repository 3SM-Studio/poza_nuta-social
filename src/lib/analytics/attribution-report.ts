import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ANALYTICS_PROJECT_KEY } from "@/lib/analytics-project";
import { isAttributionReport, type AttributionReport } from "./attribution-contract";
import type { ReportingScope } from "./reporting-scope";

export async function getAttributionReport(fromDate: string, toDateExclusive: string, scope: ReportingScope): Promise<AttributionReport | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("analytics_deterministic_attribution_v1", {
    p_project_key: ANALYTICS_PROJECT_KEY,
    p_from_date: fromDate,
    p_to_date_exclusive: toDateExclusive,
    p_scope: scope,
  });
  if (error || !isAttributionReport(data, scope, fromDate, toDateExclusive)) {
    console.error("analytics attribution read failed", { reason: "report_unavailable" });
    return null;
  }
  return data;
}
