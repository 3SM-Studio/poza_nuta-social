"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/admin";
import { invalidAdminForm, savedAdminForm, type AdminFormState } from "@/lib/admin-form-state";
import { isValidDashboardDate } from "@/lib/dashboard-range";
import { createAdminClient } from "@/lib/supabase/admin";

type CampaignField = "name" | "slug" | "startsOn" | "endsOn";

export async function createCampaignAction(previous: AdminFormState<CampaignField>, formData: FormData): Promise<AdminFormState<CampaignField>> {
  const actor = await requireEditor();
  const values = {
    name: String(formData.get("name") || ""),
    slug: String(formData.get("slug") || ""),
    startsOn: String(formData.get("startsOn") || ""),
    endsOn: String(formData.get("endsOn") || ""),
  };
  const name = values.name.trim();
  const slug = slugify(values.slug || name);
  const startsOn = values.startsOn.trim();
  const endsOn = values.endsOn.trim();
  const fieldErrors: Partial<Record<CampaignField, string>> = {};
  if (!name) fieldErrors.name = "Podaj nazwę kampanii.";
  if (!slug) fieldErrors.slug = "Slug musi zawierać literę lub cyfrę.";
  if (startsOn && !isValidDashboardDate(startsOn)) fieldErrors.startsOn = "Podaj poprawną datę rozpoczęcia.";
  if (endsOn && !isValidDashboardDate(endsOn)) fieldErrors.endsOn = "Podaj poprawną datę zakończenia.";
  if (Object.keys(fieldErrors).length) return invalidAdminForm(previous, values, fieldErrors);

  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured");
  const { error } = await admin.rpc("admin_campaign_create_v1", {
    p_actor_user_id: actor.id,
    p_actor_email: actor.email || null,
    p_name: name,
    p_slug: slug,
    p_starts_on: startsOn || null,
    p_ends_on: endsOn || null,
  });
  if (error?.code === "23505") return invalidAdminForm(previous, values, { slug: "Ten slug jest już zajęty." });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/campaigns");
  return savedAdminForm(previous);
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
