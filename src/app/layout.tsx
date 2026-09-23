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
  ...(process.env.VERCEL_ENV === "preview" ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = { themeColor: "#0d0b0d", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pl" className={`${display.variable} ${body.variable}`}><body>{children}<ConsentBanner /></body></html>;
}
