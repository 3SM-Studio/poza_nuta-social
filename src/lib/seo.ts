import type { Metadata } from "next";
import { officialDestinationUrl } from "./analytics-taxonomy";
import type { Destination } from "./types";
import { getSiteUrl } from "./env";
import { publicPage, publicPaths, type PublicPath } from "./public-paths";

export { publicPaths };

// The official-links hub is a QR/bio utility, not a separate search landing.
export const indexablePublicPaths = publicPaths.filter((path) => path !== publicPage.links);

export function publicUrl(path: PublicPath) {
  if (path === publicPage.home) return getSiteUrl();
  return new URL(path, `${getSiteUrl()}/`).toString();
}

export function publicMetadata(path: PublicPath, title: string, description: string): Metadata {
  const fullTitle = path === publicPage.home ? title : `${title} · Poza Nutą`;
  const shareImage = `${publicUrl(publicPage.home)}/opengraph-image`;
  return {
    title: path === publicPage.home ? { absolute: title } : title,
    description,
    alternates: { canonical: publicUrl(path) },
    ...(path === publicPage.links ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      locale: "pl_PL",
      siteName: "Poza Nutą",
      url: publicUrl(path),
      title: fullTitle,
      description,
      images: [{ url: shareImage, width: 1200, height: 630, alt: "Poza Nutą — wieczory karaoke w Trójmieście" }],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [shareImage] },
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

export function publicPageGraph(path: PublicPath, name: string, description: string, options: {
  destinations?: Destination[];
  includeOrganization?: boolean;
} = {}) {
  const base = publicUrl(publicPage.home);
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
      logo: `${base}/brand/poza-nuta-logo.svg`,
      email: "hello@pozanuta.pl",
      description: "Poza Nutą organizuje wieczory karaoke w Trójmieście i współpracuje z lokalami przy ich realizacji.",
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
  if (path !== publicPage.home) {
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
