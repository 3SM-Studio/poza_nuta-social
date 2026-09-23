import QRCode from "qrcode";
import { getAdminUser } from "@/lib/admin";
import { getSiteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  if (!admin) return new Response("Not configured", { status: 503 });
  const { id } = await params;
  const { data } = await admin.from("tracking_links").select("code,label").eq("id", id).maybeSingle();
  if (!data) return new Response("Not found", { status: 404 });
  const target = `${getSiteUrl()}/r/${data.code}`;
  const svg = await QRCode.toString(target, { type: "svg", errorCorrectionLevel: "Q", margin: 4, width: 1024, color: { dark: "#0d0b0d", light: "#ffffff" } });
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "private, max-age=60", ...(download ? { "Content-Disposition": `attachment; filename=pozanuta-${data.code}.svg` } : {}) } });
}
