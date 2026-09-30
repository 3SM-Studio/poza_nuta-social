import { requireAdmin } from "@/lib/admin";
import { getRealtimeReport } from "@/lib/analytics/realtime";
import { parseRealtimeWindow } from "@/lib/analytics/realtime-contract";
import { DEFAULT_REPORTING_SCOPE, parseReportingScope } from "@/lib/analytics/reporting-scope";
import { RealtimeDashboard } from "@/components/admin/realtime-dashboard";

export const dynamic = "force-dynamic";

export default async function RealtimePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const minutes = parseRealtimeWindow(typeof params.window === "string" ? params.window : null) ?? 30;
  const scope = parseReportingScope(typeof params.scope === "string" ? params.scope : null) ?? DEFAULT_REPORTING_SCOPE;
  const report = await getRealtimeReport(minutes, scope);
  return <RealtimeDashboard key={`${minutes}:${scope}`} initialReport={report} initialWindow={minutes} initialScope={scope} />;
}
