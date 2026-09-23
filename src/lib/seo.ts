import type { Metadata } from "next";
import { officialDestinationUrl } from "./analytics-taxonomy";
import type { Destination } from "./types";
import { getSiteUrl } from "./env";

export const publicPaths = ["/", "/karaoke-trojmiasto", "/dla-lokali", "/kontakt", "/privacy"] as const;

export function publicUrl(path: string) {
  if (path === "/") return getSiteUrl();
  return new URL(path, `${getSiteUrl()}/`).toString();
}

export function publicMetadata(path: string, title: string, description: string): Metadata {
  const fullTitle = path === "/" ? title : `${title} · Poza Nutą`;
  return {
    title: path === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: publicUrl(path) },
    openGraph: {
      type: "website",
      locale: "pl_PL",
      siteName: "Poza Nutą",
      url: publicUrl(path),
      title: fullTitle,
      description,
    },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}

export function officialProfiles(destinations: Destination[]) {
  const socialSlugs = new Set(["instagram", "tiktok", "facebook", "youtube"]);
  return [...new Set(destinations.flatMap((destination) => {
    if (!destination.active || !socialSlugs.has(destination.slug)) return [];
    const url = officialDestinationUrl(destination.slug, destination.url);
    return url ? [url] : [];
  }))];
}

export function publicPageGraph(path: string, name: string, description: string, options: {
  destinations?: Destination[];
  includeOrganization?: boolean;
} = {}) {
  const base = publicUrl("/");
  const url = publicUrl(path);
  const organizationId = `${base}#organization`;
  const websiteId = `${base}#website`;
  const nodes: Record<string, unknown>[] = [];

  if (options.includeOrganization) {
    const profiles = officialProfiles(options.destinations || []);
    nodes.push({
      "@type": "Organization",
      "@id": organizationId,
      name: "Poza Nutą",
      url: base,
      description: "Poza Nutą organizuje karaoke i wydarzenia muzyczne w Trójmieście oraz współpracuje z lokalami.",
      areaServed: "Trójmiasto",
      ...(profiles.length ? { sameAs: profiles } : {}),
    });
    nodes.push({
      "@type": "WebSite",
      "@id": websiteId,
      name: "Poza Nutą",
      url: base,
      inLanguage: "pl-PL",
      publisher: { "@id": organizationId },
    });
  }

  const page: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: "pl-PL",
    isPartOf: { "@id": websiteId },
    about: { "@id": organizationId },
  };
  if (path !== "/") {
    page.breadcrumb = { "@id": `${url}#breadcrumb` };
    nodes.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Poza Nutą", item: base },
        { "@type": "ListItem", position: 2, name, item: url },
      ],
    });
  }
  nodes.push(page);
  return { "@context": "https://schema.org", "@graph": nodes };
}
