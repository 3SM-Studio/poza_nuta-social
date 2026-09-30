import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

const blocked = ["/admin", "/api", "/r/", "/go/", "/auth"];

export default function robots(): MetadataRoute.Robots {
  // Preview pages remain crawlable so bots can read the global noindex header.
  // They do not advertise production URLs through a preview sitemap.
  if (process.env.VERCEL_ENV === "preview") return { rules: { userAgent: "*", allow: "/" } };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: blocked },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: blocked },
      // GPTBot policy remains intentionally separate from search visibility.
      { userAgent: "GPTBot", disallow: "/" },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
