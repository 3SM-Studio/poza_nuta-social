import { describe, expect, it } from "vitest";
import type { Destination } from "./types";
import { officialProfiles, publicPageGraph, publicPaths, publicUrl } from "./seo";

function destination(slug: string, url: string, active = true): Destination {
  return { id: slug, slug, label: slug, description: null, url, icon: slug, sort_order: 0, active };
}

describe("public SEO model", () => {
  it("publishes only the durable public routes", () => {
    expect(publicPaths).toEqual(["/", "/karaoke-trojmiasto", "/dla-lokali", "/kontakt", "/privacy"]);
  });

  it("uses the configured origin for either candidate production domain", () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      for (const origin of ["https://social.pozanuta.pl", "https://socials.pozanuta.pl"]) {
        process.env.NEXT_PUBLIC_SITE_URL = origin;
        expect(publicUrl("/")).toBe(origin);
        expect(publicUrl("/dla-lokali")).toBe(`${origin}/dla-lokali`);
      }
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
    expect(graph["@graph"].map((node) => node["@type"])).toEqual(["Organization", "WebSite", "WebPage"]);
  });

  it("uses a page and a two-level breadcrumb for deeper public routes", () => {
    const graph = publicPageGraph("/dla-lokali", "Współpraca z lokalami", "Opis");
    expect(graph["@graph"].map((node) => node["@type"])).toEqual(["BreadcrumbList", "WebPage"]);
    expect(graph["@graph"][1].url).toContain("/dla-lokali");
  });
});
