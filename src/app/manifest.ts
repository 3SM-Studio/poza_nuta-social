import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poza Nutą",
    short_name: "Poza Nutą",
    description: "Oficjalna wizytówka Poza Nutą: sociale i kontakt w Trójmieście.",
    start_url: "/",
    display: "browser",
    background_color: "#0d0b0d",
    theme_color: "#ff4fa3",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
