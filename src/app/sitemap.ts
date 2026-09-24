import type { MetadataRoute } from "next";
import { publicPaths } from "@/lib/public-paths";
import { publicUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({ url: publicUrl(path) }));
}
