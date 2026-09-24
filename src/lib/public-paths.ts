// Public marketing pages shared by SEO and page-view validation.
// Referral landings and redirect endpoints have separate contracts.
export const publicPaths = ["/", "/karaoke-trojmiasto", "/dla-lokali", "/kontakt", "/linki", "/privacy", "/cookies"] as const;

export type PublicPath = typeof publicPaths[number];

export function isPublicPath(value: unknown): value is PublicPath {
  return typeof value === "string" && publicPaths.some((path) => path === value);
}
