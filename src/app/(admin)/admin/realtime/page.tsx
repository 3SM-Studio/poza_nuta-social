import { requireAdmin } from "@/lib/admin";
import { getRealtimeReport } from "@/lib/analytics/realtime";
import { parseRealtimeWindow } from "@/lib/analytics/realtime-contract";
import { RealtimeDashboard } from "@/components/admin/realtime-dashboard";

export const dynamic = "force-dynamic";

export default async function RealtimePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const minutes = parseRealtimeWindow(typeof params.window === "string" ? params.window : null) ?? 30;
  const report = await getRealtimeReport(minutes);
  return <RealtimeDashboard key={minutes} initialReport={report} initialWindow={minutes} />;
}
