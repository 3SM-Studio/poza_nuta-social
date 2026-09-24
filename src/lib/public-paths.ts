// Public page identities shared by UI, SEO and page-view validation.
// Referral landings and redirect endpoints have separate contracts.
export const publicPage = {
  home: "/",
  karaoke: "/karaoke-trojmiasto",
  venues: "/dla-lokali",
  contact: "/kontakt",
  links: "/linki",
  privacy: "/privacy",
  cookies: "/cookies",
} as const;

export const publicPaths = Object.values(publicPage);

export type PublicPath = typeof publicPaths[number];

export function isPublicPath(value: unknown): value is PublicPath {
  return typeof value === "string" && publicPaths.some((path) => path === value);
}
