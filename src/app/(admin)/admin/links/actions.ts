"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizePath, sanitizeTaxonomyValue } from "@/lib/analytics-taxonomy";
import { createTrackingCode } from "@/lib/tracking-code";

export async function createTrackingLinkAction(formData: FormData) {
  const actor = await requireEditor();
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured");
  const label = String(formData.get("label") || "").trim();
  const campaignId = String(formData.get("campaignId") || "").trim() || null;
  const channelGroup = String(formData.get("channelGroup") || "offline");
  const source = sanitizeTaxonomyValue(String(formData.get("source") || "poster"), 64) || "poster";
  const medium = sanitizeTaxonomyValue(String(formData.get("medium") || "qr"), 64) || "qr";
  const asset = String(formData.get("asset") || "").trim() || null;
  const placement = String(formData.get("placement") || "").trim() || null;
  const landingPath = sanitizePath(String(formData.get("landingPath") || "/").trim());
  if (!label || label.length > 120) throw new Error("Tracking link label is required");
  if (!new Set(["offline", "organic_social", "ai_referral", "referral"]).has(channelGroup)) throw new Error("Unsupported channel group");

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = createTrackingCode();
    const { error } = await admin.rpc("admin_tracking_link_create_v1", {
      p_actor_user_id: actor.id,
      p_actor_email: actor.email || null,
      p_code: code,
      p_label: label,
      p_campaign_id: campaignId,
      p_channel_group: channelGroup,
      p_source: source,
      p_medium: medium,
      p_asset: asset,
      p_asset_slug: asset ? slugify(asset) : null,
      p_placement: placement,
      p_placement_slug: placement ? slugify(placement) : null,
      p_landing_path: landingPath,
    });
    if (!error) { revalidatePath("/admin/links"); return; }
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("Could not allocate unique tracking code");
}

export async function toggleTrackingLinkAction(formData: FormData) {
  const actor = await requireEditor();
  const admin = createAdminClient();
  if (!admin) return;
  const id = String(formData.get("id") || "");
  const { error } = await admin.rpc("admin_tracking_link_toggle_v1", {
    p_actor_user_id: actor.id,
    p_actor_email: actor.email || null,
    p_tracking_link_id: id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/links");
}

function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "item"; }
