import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ANALYTICS_PROJECT_KEY } from "@/lib/analytics-project";
import { isSegmentReport, type SegmentKey, type SegmentReport } from "./segment-contract";
import type { ReportingScope } from "./reporting-scope";

export async function getSegmentReport(fromDate: string, toDateExclusive: string, scope: ReportingScope, selectedKey: SegmentKey): Promise<SegmentReport | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("analytics_consented_segments_v1", {
    p_project_key: ANALYTICS_PROJECT_KEY,
    p_from_date: fromDate,
    p_to_date_exclusive: toDateExclusive,
    p_scope: scope,
    p_segment_key: selectedKey,
  });
  if (error || !isSegmentReport(data, scope, fromDate, toDateExclusive, selectedKey)) {
    console.error("analytics segments read failed", { reason: "report_unavailable" });
    return null;
  }
  return data;
}
