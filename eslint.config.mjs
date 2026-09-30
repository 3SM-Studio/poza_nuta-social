import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // ImageResponse renders a brand SVG data URL; next/image is not used in OG image generation.
  { files: ["src/app/opengraph-image.tsx"], rules: { "@next/next/no-img-element": "off" } },
  globalIgnores([".next/**", "node_modules/**", "coverage/**", ".agents/skills/impeccable/scripts/**"]),
]);
