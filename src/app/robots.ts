import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

const blocked = ["/admin/", "/api/", "/r/", "/go/", "/auth/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: blocked },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: blocked },
      // GPTBot policy remains intentionally separate from search visibility.
      { userAgent: "GPTBot", disallow: "/" },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
    host: getSiteUrl(),
  };
}
