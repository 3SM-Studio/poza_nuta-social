import "server-only";

import { ANALYTICS_PROJECT_KEY } from "@/lib/analytics-project";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRealtimeReport, type RealtimeReport, type RealtimeWindow } from "./realtime-contract";
import { DEFAULT_REPORTING_SCOPE, type ReportingScope } from "./reporting-scope";

export async function getRealtimeReport(minutes: RealtimeWindow, scope: ReportingScope = DEFAULT_REPORTING_SCOPE, now = new Date()): Promise<RealtimeReport | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("analytics_realtime_v2", {
    p_project_key: ANALYTICS_PROJECT_KEY,
    p_minutes: minutes,
    p_now: now.toISOString(),
    p_scope: scope,
  });
  if (error || !isRealtimeReport(data, scope, minutes, now)) {
    console.error("analytics realtime read failed", { reason: "report_unavailable" });
    return null;
  }
  return data;
}
