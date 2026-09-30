import { describe, expect, it } from "vitest";
import type { Destination } from "./types";
import { indexablePublicPaths, officialProfiles, publicMetadata, publicPageGraph, publicPaths, publicUrl } from "./seo";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import nextConfig from "../../next.config";

function destination(slug: string, url: string, active = true): Destination {
  return { id: slug, slug, label: slug, description: null, url, icon: slug, sort_order: 0, active };
}

describe("public SEO model", () => {
  it("publishes only the durable public routes", () => {
    expect(publicPaths).toEqual(["/", "/karaoke", "/dla-lokali", "/kontakt", "/linki", "/prywatnosc", "/cookies"]);
    expect(indexablePublicPaths).toEqual(["/", "/karaoke", "/dla-lokali", "/kontakt", "/prywatnosc", "/cookies"]);
    const original = process.env.VERCEL_ENV;
    try {
      delete process.env.VERCEL_ENV;
      expect(sitemap().map((entry) => new URL(entry.url).pathname)).toEqual(indexablePublicPaths);
    } finally {
      if (original === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = original;
    }
    expect(publicMetadata("/linki", "Oficjalne linki", "Opis").robots).toEqual({ index: false, follow: true });
  });

  it("does not advertise production URLs in preview and applies an HTTP noindex header", async () => {
    const original = process.env.VERCEL_ENV;
    try {
      process.env.VERCEL_ENV = "preview";
      expect(sitemap()).toEqual([]);
      expect(robots()).toEqual({ rules: { userAgent: "*", allow: "/" } });
      const headers = await nextConfig.headers?.();
      expect(headers?.find((entry) => entry.source === "/(.*)")?.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" });
    } finally {
      if (original === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = original;
    }
  });

  it("uses the configured root origin for all public routes", () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      process.env.NEXT_PUBLIC_SITE_URL = "https://pozanuta.pl";
      expect(publicUrl("/")).toBe("https://pozanuta.pl");
      expect(publicUrl("/dla-lokali")).toBe("https://pozanuta.pl/dla-lokali");
      expect(publicUrl("/linki")).toBe("https://pozanuta.pl/linki");
      const metadata = publicMetadata("/karaoke", "Karaoke", "Opis");
      expect(metadata.openGraph?.images).toEqual([{ url: "https://pozanuta.pl/opengraph-image", width: 1200, height: 630, alt: "Poza Nutą — wieczory karaoke w Trójmieście" }]);
      expect(metadata.twitter?.images).toEqual(["https://pozanuta.pl/opengraph-image"]);
    } finally {
      if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = original;
    }
  });

  it("limits sameAs to active validated official social profiles", () => {
    const destinations = [
      destination("instagram", "https://www.instagram.com/poza.nuta/"),
      destination("instagram", "https://www.instagram.com/poza.nuta/"),
      destination("tiktok", "https://www.tiktok.com/@poza.nuta", false),
      destination("facebook", "https://facebook.com.evil.example/poza.nuta"),
      destination("website", "https://pozanuta.pl/"),
    ];
    expect(officialProfiles(destinations)).toEqual(["https://www.instagram.com/poza.nuta/"]);
    const graph = publicPageGraph("/", "Poza Nutą", "Opis", { includeOrganization: true, destinations });
    const organization = graph["@graph"].find((node) => node["@type"] === "Organization");
    expect(organization?.sameAs).toEqual(["https://www.instagram.com/poza.nuta/"]);
    expect(organization?.logo).toBe(`${publicUrl("/")}/brand/poza-nuta-logo.svg`);
    expect(organization?.email).toBe("hello@pozanuta.pl");
    expect(graph["@graph"].map((node) => node["@type"])).toEqual(["Organization", "WebSite", "WebPage"]);
  });

  it("uses a page and a two-level breadcrumb for deeper public routes", () => {
    const graph = publicPageGraph("/dla-lokali", "Współpraca z lokalami", "Opis");
    expect(graph["@graph"].map((node) => node["@type"])).toEqual(["BreadcrumbList", "WebPage"]);
    expect(graph["@graph"][1].url).toContain("/dla-lokali");
  });
});
