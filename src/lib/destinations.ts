import { createAdminClient } from "@/lib/supabase/admin";
import { settleWithin } from "@/lib/async";
import type { Destination } from "@/lib/types";

function envFallback(): Destination[] {
  const candidates: Array<[string, string, string | undefined, string, string | null]> = [
    ["instagram", "Instagram", process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/poza.nuta/", "instagram", "Zdjęcia, relacje i najnowsze informacje."],
    ["tiktok", "TikTok", process.env.NEXT_PUBLIC_TIKTOK_URL, "music", null],
    ["facebook", "Facebook", process.env.NEXT_PUBLIC_FACEBOOK_URL, "facebook", null],
    ["youtube", "YouTube", process.env.NEXT_PUBLIC_YOUTUBE_URL, "youtube", null],
    ["website", "Poza Nutą", process.env.NEXT_PUBLIC_MAIN_SITE_URL, "globe", null],
  ];

  const destinations: Destination[] = [];
  for (const [slug, label, url, icon, description] of candidates) {
    if (!url) continue;
    destinations.push({
      id: `fallback-${slug}`,
      slug,
      label,
      description,
      url,
      icon,
      sort_order: destinations.length * 10,
      active: true,
    });
  }
  return destinations;
}

export async function getPublicDestinations(): Promise<Destination[]> {
  const admin = createAdminClient();
  if (!admin) return envFallback();

  const result = await settleWithin(Promise.resolve(admin
    .from("destinations")
    .select("id,slug,label,description,url,icon,sort_order,active")
    .eq("active", true)
    .order("sort_order", { ascending: true })), 1_200, null);

  // Once a database is configured it is authoritative. A transient outage must
  // never resurrect an admin-disabled destination from environment variables.
  if (!result || result.error) return [];
  return (result.data || []) as Destination[];
}
