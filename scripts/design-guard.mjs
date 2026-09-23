import { existsSync, readFileSync } from "node:fs";

const required = ["PRODUCT.md", "DESIGN.md", "components.json", "docs/PRODUCT_DECISIONS.md"];
for (const file of required) if (!existsSync(file)) throw new Error(`Design/product contract missing: ${file}`);
const product = readFileSync("PRODUCT.md", "utf8");
const design = readFileSync("DESIGN.md", "utf8");
if (!product.includes("impeccable:product-schema 1")) throw new Error("PRODUCT.md is not initialized with the Impeccable product schema.");
for (const heading of ["## Overview","## Colors","## Typography","## Layout","## Elevation & Depth","## Shapes","## Components","## Do's and Don'ts"]) {
  if (!design.includes(heading)) throw new Error(`DESIGN.md is missing canonical heading: ${heading}`);
}
const publicSource = ["src/app/page.tsx", "src/app/layout.tsx"].map((file) => readFileSync(file, "utf8")).join("\n");
if (publicSource.includes("Gdynia · Trójmiasto") || publicSource.includes("Gdyni i Trójmieście")) throw new Error("Public copy violates approved Trójmiasto-only primary geography.");
if (publicSource.includes("Nie musisz umieć śpiewać. Musisz chcieć śpiewać.")) throw new Error("Temporary slogan was hard-coded although final slogan is unresolved.");
if (/gradient|from-(?:purple|blue)|to-(?:purple|blue)/i.test(publicSource)) throw new Error("Public source contains a decorative gradient against DESIGN.md.");
console.log("design-guard: ok");
