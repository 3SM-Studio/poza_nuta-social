import { publicPage } from "./public-paths";

// Order and labels of the primary public navigation.
export const publicNavigation = [
  { href: publicPage.karaoke, label: "Karaoke" },
  { href: publicPage.venues, label: "Dla lokali" },
  { href: publicPage.contact, label: "Kontakt" },
  { href: publicPage.links, label: "Linki" },
] as const;
