"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/admin";
import { resolveDestinationSortOrder } from "@/lib/destination-order";
import { createAdminClient } from "@/lib/supabase/admin";
import { officialDestinationUrl } from "@/lib/analytics-taxonomy";

const allowedDestinationSlugs = new Set(["instagram", "tiktok", "facebook", "youtube", "website"]);

export async function createDestinationAction(formData: FormData) {
  const actor = await requireEditor();
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured");
  const label = String(formData.get("label") || "").trim();
  const slug = slugify(String(formData.get("slug") || label));
  const rawUrl = String(formData.get("url") || "");
  const url = officialDestinationUrl(slug, rawUrl);
  const icon = String(formData.get("icon") || "external-link").trim() || "external-link";
  const description = String(formData.get("description") || "").trim() || null;
  const sortOrder = resolveDestinationSortOrder(slug, formData.get("sortOrder"));
  if (!label || !slug || !url || !allowedDestinationSlugs.has(slug)) throw new Error("Only official Poza Nutą channel destinations are allowed");
  const { error } = await admin.rpc("admin_destination_upsert_v1", {
    p_actor_user_id: actor.id,
    p_actor_email: actor.email || null,
    p_label: label,
    p_slug: slug,
    p_url: url,
    p_icon: icon,
    p_description: description,
    p_sort_order: sortOrder,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/"); revalidatePath("/admin/destinations");
}

export async function toggleDestinationAction(formData: FormData) {
  const actor = await requireEditor();
  const admin = createAdminClient();
  if (!admin) return;
  const id = String(formData.get("id") || "");
  const { error } = await admin.rpc("admin_destination_toggle_v1", {
    p_actor_user_id: actor.id,
    p_actor_email: actor.email || null,
    p_destination_id: id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/"); revalidatePath("/admin/destinations");
}

function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64); }
