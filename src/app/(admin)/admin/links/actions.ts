"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/admin";
import { invalidAdminForm, savedAdminForm, type AdminFormState } from "@/lib/admin-form-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeReferralLandingPath, sanitizeTaxonomyValue } from "@/lib/analytics-taxonomy";
import { createTrackingCode } from "@/lib/tracking-code";

type TrackingLinkField = "label" | "campaignId" | "channelGroup" | "source" | "medium" | "asset" | "placement" | "landingPath";

export async function createTrackingLinkAction(previous: AdminFormState<TrackingLinkField>, formData: FormData): Promise<AdminFormState<TrackingLinkField>> {
  const actor = await requireEditor();
  const values = {
    label: String(formData.get("label") || ""),
    campaignId: String(formData.get("campaignId") || ""),
    channelGroup: String(formData.get("channelGroup") || "offline"),
    source: String(formData.get("source") || "poster"),
    medium: String(formData.get("medium") || "qr"),
    asset: String(formData.get("asset") || ""),
    placement: String(formData.get("placement") || ""),
    landingPath: String(formData.get("landingPath") || "/"),
  };
  const label = values.label.trim();
  const campaignId = values.campaignId.trim() || null;
  const channelGroup = values.channelGroup;
  const source = sanitizeTaxonomyValue(values.source, 64) || "poster";
  const medium = sanitizeTaxonomyValue(values.medium, 64) || "qr";
  const asset = values.asset.trim() || null;
  const placement = values.placement.trim() || null;
  const landingPath = sanitizeReferralLandingPath(values.landingPath.trim());
  const fieldErrors: Partial<Record<TrackingLinkField, string>> = {};
  if (!label || label.length > 120) fieldErrors.label = "Podaj nazwę linku (maksymalnie 120 znaków).";
  if (campaignId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId)) fieldErrors.campaignId = "Wybierz poprawną kampanię.";
  if (!["offline", "organic_social", "ai_referral", "referral"].includes(channelGroup)) fieldErrors.channelGroup = "Wybierz dostępny kanał.";
  if (Object.keys(fieldErrors).length) return invalidAdminForm(previous, values, fieldErrors);

  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured");

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
    if (!error) { revalidatePath("/admin/links"); return savedAdminForm(previous); }
    if (error.code === "23503") return invalidAdminForm(previous, values, { campaignId: "Wybrana kampania nie jest już dostępna." });
    if (error.code === "23514") return invalidAdminForm(previous, values, {}, "Ten zestaw ustawień linku nie jest dozwolony.");
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
