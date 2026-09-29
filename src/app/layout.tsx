import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { DM_Sans } from "next/font/google";
import { getSiteUrl } from "@/lib/env";
import { ConsentBanner } from "@/components/consent-controls";
import { PublicSkipLink } from "@/components/public-skip-link";
import { ANALYTICS_CONSENT_COOKIE, verifyAnalyticsToken } from "@/lib/analytics-token";
import { CONSENT_PREFERENCE_COOKIE, parseLocalPreference } from "@/lib/consent-preference";
import { CONSENT_VERSION, tokenMatchesEnvironment } from "@/lib/tracking-context";
import { resolveServerEnvironment } from "@/lib/runtime-environment";
import type { AnalyticsEnvironment } from "@/lib/analytics-taxonomy";
import "./globals.css";

const body = DM_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Poza Nutą — Trójmiasto", template: "%s · Poza Nutą" },
  description: "Poza Nutą organizuje wieczory karaoke w Trójmieście. Informacje dla uczestników i lokali, oficjalne kanały oraz kontakt.",
  ...(process.env.VERCEL_ENV === "preview" ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = { themeColor: "#080808", colorScheme: "dark" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const preference = parseLocalPreference(store.get(CONSENT_PREFERENCE_COOKIE)?.value);
  const consent = await verifyAnalyticsToken<{ analytics: boolean; version: number; exp: number; environment?: AnalyticsEnvironment }>(
    "consent", store.get(ANALYTICS_CONSENT_COOKIE)?.value,
  );
  const initialConsentMissing = !preference && !(tokenMatchesEnvironment(consent, resolveServerEnvironment())
    && consent?.version === CONSENT_VERSION && typeof consent.analytics === "boolean");
  return <html lang="pl" className={body.variable}><body><PublicSkipLink /><ConsentBanner initialConsentMissing={initialConsentMissing} />{children}</body></html>;
}
