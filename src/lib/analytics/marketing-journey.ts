import { publicPage } from "../public-paths";

// Stable identities for consequential public actions. Labels and CSS never identify events.
export const MARKETING_CTAS = {
  "home.hero_karaoke": { location: "homepage.hero", sourcePath: publicPage.home, destinationPath: publicPage.karaoke, journey: "karaoke_information", audience: "participant" },
  "home.hero_dates": { location: "homepage.hero", sourcePath: publicPage.home, destinationPath: publicPage.links, journey: "current_information", audience: "participant" },
  "home.participation_karaoke": { location: "homepage.participation", sourcePath: publicPage.home, destinationPath: publicPage.karaoke, journey: "karaoke_information", audience: "participant" },
  "home.case_venues": { location: "homepage.case_study", sourcePath: publicPage.home, destinationPath: publicPage.venues, journey: "venue_collaboration", audience: "venue" },
  "home.closing_dates": { location: "homepage.closing", sourcePath: publicPage.home, destinationPath: publicPage.links, journey: "current_information", audience: "participant" },
  "karaoke.hero_dates": { location: "karaoke.hero", sourcePath: publicPage.karaoke, destinationPath: publicPage.links, journey: "current_information", audience: "participant" },
  "karaoke.current_dates": { location: "karaoke.current_info", sourcePath: publicPage.karaoke, destinationPath: publicPage.links, journey: "current_information", audience: "participant" },
  "karaoke.venue_bridge": { location: "karaoke.venue_bridge", sourcePath: publicPage.karaoke, destinationPath: publicPage.venues, journey: "venue_collaboration", audience: "venue" },
  "venues.hero_contact": { location: "dla_lokali.hero", sourcePath: publicPage.venues, destinationPath: publicPage.contact, journey: "venue_collaboration", audience: "venue" },
  "venues.closing_contact": { location: "dla_lokali.closing", sourcePath: publicPage.venues, destinationPath: publicPage.contact, journey: "venue_collaboration", audience: "venue" },
  "contact.venues": { location: "contact.venue_route", sourcePath: publicPage.contact, destinationPath: publicPage.venues, journey: "venue_collaboration", audience: "venue" },
  "contact.official_channels": { location: "contact.current_info", sourcePath: publicPage.contact, destinationPath: publicPage.links, journey: "current_information", audience: "participant" },
  "links.contact": { location: "links.contact", sourcePath: publicPage.links, destinationPath: publicPage.contact, journey: "contact", audience: "venue" },
} as const;

export const MARKETING_SECTIONS = {
  "home.participation": { sourcePath: publicPage.home, journey: "karaoke_information", audience: "participant" },
  "home.case_study": { sourcePath: publicPage.home, journey: "venue_collaboration", audience: "venue" },
  "venues.case_study": { sourcePath: publicPage.venues, journey: "venue_collaboration", audience: "venue" },
} as const;

export type MarketingCtaId = keyof typeof MARKETING_CTAS;
export type MarketingSectionId = keyof typeof MARKETING_SECTIONS;

export function marketingCta(value: unknown) {
  return typeof value === "string" && Object.hasOwn(MARKETING_CTAS, value)
    ? MARKETING_CTAS[value as MarketingCtaId] : null;
}

export function marketingSection(value: unknown) {
  return typeof value === "string" && Object.hasOwn(MARKETING_SECTIONS, value)
    ? MARKETING_SECTIONS[value as MarketingSectionId] : null;
}
