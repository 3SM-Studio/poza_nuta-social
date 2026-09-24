import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isFunnelReport, type FunnelKey, type FunnelReport } from "./funnel-contract";
import type { ReportingScope } from "./reporting-scope";

export async function getFunnelReport(key: FunnelKey, fromDate: string, toDateExclusive: string, scope: ReportingScope): Promise<FunnelReport | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("analytics_funnel_v1", {
    p_funnel_key: key,
    p_from_date: fromDate,
    p_to_date_exclusive: toDateExclusive,
    p_scope: scope,
  });
  if (error || !isFunnelReport(data, key, scope)) {
    console.error("analytics funnel read failed", { reason: "report_unavailable" });
    return null;
  }
  return data;
}
