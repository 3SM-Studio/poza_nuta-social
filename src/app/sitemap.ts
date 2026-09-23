import type { MetadataRoute } from "next";
import { publicPaths, publicUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({ url: publicUrl(path) }));
}
