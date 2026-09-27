import type { Viewport } from "next";
import { Instrument_Serif } from "next/font/google";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { Analytics } from "@/lib/analytics";
import "./editorial.css";

const serif = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin", "latin-ext"], variable: "--font-ed-serif", display: "swap" });

// Next's route segment config must be a statically analyzable literal.
export const revalidate = 60;
export const viewport: Viewport = { themeColor: "#f7f6f3", colorScheme: "light" };

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${serif.variable} editorial-site flex min-h-svh w-full flex-col`}>
      <Analytics />
      <PublicHeader fontClassName={serif.variable} />
      {children}
      <PublicFooter />
    </div>
  );
}
