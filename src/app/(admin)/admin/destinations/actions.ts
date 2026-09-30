"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/admin";
import { invalidAdminForm, savedAdminForm, type AdminFormState } from "@/lib/admin-form-state";
import { resolveDestinationSortOrder } from "@/lib/destination-order";
import { createAdminClient } from "@/lib/supabase/admin";
import { officialDestinationUrl } from "@/lib/analytics-taxonomy";

const allowedDestinationSlugs = new Set(["instagram", "tiktok", "facebook", "youtube", "website"]);

type DestinationField = "label" | "slug" | "url" | "icon" | "sortOrder" | "description";

export async function createDestinationAction(previous: AdminFormState<DestinationField>, formData: FormData): Promise<AdminFormState<DestinationField>> {
  const actor = await requireEditor();
  const values = {
    label: String(formData.get("label") || ""),
    slug: String(formData.get("slug") || ""),
    url: String(formData.get("url") || ""),
    icon: String(formData.get("icon") || "external-link"),
    sortOrder: String(formData.get("sortOrder") || ""),
    description: String(formData.get("description") || ""),
  };
  const label = values.label.trim();
  const slug = slugify(values.slug || label);
  const url = officialDestinationUrl(slug, values.url);
  const icon = values.icon.trim() || "external-link";
  const description = values.description.trim() || null;
  const sortOrder = resolveDestinationSortOrder(slug, formData.get("sortOrder"));
  const fieldErrors: Partial<Record<DestinationField, string>> = {};
  if (!label) fieldErrors.label = "Podaj nazwę destynacji.";
  if (!allowedDestinationSlugs.has(slug)) fieldErrors.slug = "Wybierz oficjalny kanał: instagram, tiktok, facebook, youtube lub website.";
  if (!url) fieldErrors.url = "Podaj adres HTTPS należący do wybranego kanału.";
  if (Object.keys(fieldErrors).length) return invalidAdminForm(previous, values, fieldErrors);

  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured");
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
  if (error?.code === "23514") return invalidAdminForm(previous, values, {}, "Ten zestaw ustawień destynacji nie jest dozwolony.");
  if (error) throw new Error(error.message);
  revalidatePath("/"); revalidatePath("/admin/destinations");
  return savedAdminForm(previous);
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
