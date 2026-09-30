import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isPathsReport, type PathsReport } from "./paths-contract";
import type { ReportingScope } from "./reporting-scope";

export async function getPathsReport(fromDate: string, toDateExclusive: string, scope: ReportingScope, path: string | null): Promise<PathsReport | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("analytics_paths_v1", {
    p_from_date: fromDate,
    p_to_date_exclusive: toDateExclusive,
    p_scope: scope,
    p_path: path,
  });
  if (error || !isPathsReport(data, scope, path)) {
    console.error("analytics paths read failed", { reason: "report_unavailable" });
    return null;
  }
  return data;
}
