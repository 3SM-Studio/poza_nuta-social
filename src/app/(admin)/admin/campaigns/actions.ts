"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createCampaignAction(formData: FormData) {
  const actor = await requireEditor();
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured");
  const name = String(formData.get("name") || "").trim();
  const slug = slugify(String(formData.get("slug") || name));
  if (!name || !slug) throw new Error("Campaign name is required");
  const startsOn = nullableDate(formData.get("startsOn"));
  const endsOn = nullableDate(formData.get("endsOn"));
  const { error } = await admin.rpc("admin_campaign_create_v1", {
    p_actor_user_id: actor.id,
    p_actor_email: actor.email || null,
    p_name: name,
    p_slug: slug,
    p_starts_on: startsOn,
    p_ends_on: endsOn,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/campaigns");
}

export async function archiveCampaignAction(formData: FormData) {
  const actor = await requireEditor();
  const admin = createAdminClient();
  const id = String(formData.get("id") || "");
  if (!admin || !id) return;
  const { error } = await admin.rpc("admin_campaign_archive_v1", {
    p_actor_user_id: actor.id,
    p_actor_email: actor.email || null,
    p_campaign_id: id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/campaigns");
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}
function nullableDate(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}
