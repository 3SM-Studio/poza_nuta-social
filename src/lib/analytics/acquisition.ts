import "server-only";

import { ANALYTICS_PROJECT_KEY } from "@/lib/analytics-project";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportingScope } from "./reporting-scope";
import { isAcquisitionDetail, isAcquisitionOverview, type AcquisitionDetail, type AcquisitionOverview } from "./acquisition-contract";

export async function getAcquisitionOverview(fromDate: string, toDateExclusive: string, scope: ReportingScope, offset = 0): Promise<AcquisitionOverview | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("analytics_acquisition_overview_v1", {
    p_project_key: ANALYTICS_PROJECT_KEY,
    p_from_date: fromDate,
    p_to_date_exclusive: toDateExclusive,
    p_scope: scope,
    p_limit: 50,
    p_offset: offset,
  });
  if (error || !isAcquisitionOverview(data, scope, fromDate, toDateExclusive)) {
    console.error("analytics acquisition overview read failed", { reason: "report_unavailable" });
    return null;
  }
  return data;
}

export async function getAcquisitionDetail(fromDate: string, toDateExclusive: string, scope: ReportingScope, campaignId: string): Promise<AcquisitionDetail | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("analytics_acquisition_detail_v1", {
    p_project_key: ANALYTICS_PROJECT_KEY,
    p_from_date: fromDate,
    p_to_date_exclusive: toDateExclusive,
    p_scope: scope,
    p_campaign_id: campaignId,
  });
  if (error || !isAcquisitionDetail(data, scope, fromDate, toDateExclusive, campaignId)) {
    console.error("analytics acquisition detail read failed", { reason: "report_unavailable" });
    return null;
  }
  return data;
}
