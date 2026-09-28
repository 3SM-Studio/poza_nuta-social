import type { MetadataRoute } from "next";
import { indexablePublicPaths, publicUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV === "preview") return [];
  return indexablePublicPaths.map((path) => ({ url: publicUrl(path) }));
}
