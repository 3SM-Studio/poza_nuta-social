import "server-only";

import { ANALYTICS_PROJECT_KEY } from "@/lib/analytics-project";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RealtimeReport, RealtimeWindow } from "./realtime-contract";

export async function getRealtimeReport(minutes: RealtimeWindow, now = new Date()): Promise<RealtimeReport | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("analytics_realtime_v1", {
    p_project_key: ANALYTICS_PROJECT_KEY,
    p_minutes: minutes,
    p_now: now.toISOString(),
  });
  if (error || !data || typeof data !== "object") {
    console.error("analytics realtime read failed", { reason: "report_unavailable" });
    return null;
  }
  return data as RealtimeReport;
}
