import { getAdminAccess } from "@/lib/admin";
import { getRealtimeReport } from "@/lib/analytics/realtime";
import { parseRealtimeWindow } from "@/lib/analytics/realtime-contract";
import { DEFAULT_REPORTING_SCOPE, parseReportingScope } from "@/lib/analytics/reporting-scope";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await getAdminAccess();
  if (!access) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const url = new URL(request.url);
  const window = parseRealtimeWindow(url.searchParams.get("window"));
  const scope = url.searchParams.has("scope") ? parseReportingScope(url.searchParams.get("scope")) : DEFAULT_REPORTING_SCOPE;
  if (!window || !scope || url.searchParams.getAll("window").length !== 1 || url.searchParams.getAll("scope").length > 1
    || [...url.searchParams.keys()].some((key) => key !== "window" && key !== "scope")) {
    return Response.json({ error: "invalid_window" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const report = await getRealtimeReport(window, scope);
  if (!report) return Response.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return Response.json(report, { headers: { "Cache-Control": "private, no-store" } });
}
