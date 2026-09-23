import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";
import { getSiteUrl } from "@/lib/env";
import { ConsentBanner } from "@/components/consent-controls";
import "./globals.css";

const display = Bebas_Neue({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap" });
const body = Space_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Poza Nutą — Trójmiasto", template: "%s · Poza Nutą" },
  description: "Oficjalna wizytówka Poza Nutą: sociale, kontakt i współpraca. Karaoke i wydarzenia muzyczne w Trójmieście.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", locale: "pl_PL", url: "/", siteName: "Poza Nutą",
    title: "Poza Nutą — Trójmiasto",
    description: "Oficjalne profile, kontakt i współpraca z Poza Nutą w Trójmieście.",
  },
  twitter: { card: "summary_large_image", title: "Poza Nutą — Trójmiasto", description: "Oficjalne profile, kontakt i współpraca z Poza Nutą." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#0d0b0d", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pl" className={`${display.variable} ${body.variable}`}><body>{children}<ConsentBanner /></body></html>;
}
