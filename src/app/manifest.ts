import type { MetadataRoute } from "next";
import { outputColorHex } from "@/lib/color-compat";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poza Nutą",
    short_name: "Poza Nutą",
    description: "Poza Nutą — karaoke i wydarzenia muzyczne w Trójmieście.",
    start_url: "/",
    display: "browser",
    background_color: outputColorHex.nearBlack,
    theme_color: outputColorHex.brandPink,
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
