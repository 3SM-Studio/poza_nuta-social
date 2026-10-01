import { test } from "node:test";
import assert from "node:assert/strict";
import { compatibilityColorErrors, designColorLiteralErrors } from "./color-guard.mjs";
import { readFileSync } from "node:fs";

test("frontend design literals fail while contextual values and OKLCH tokens pass", () => {
  const file = "src/app/example.css";
  assert.equal(designColorLiteralErrors(file, "color: #fff; background: rgb(1 2 3); border: hsl(0 0% 0%);").length, 3);
  assert.deepEqual(designColorLiteralErrors(file, "color: currentColor; background: transparent; --accent: oklch(0.5 0.1 5); background: color-mix(in srgb, var(--accent), transparent);"), []);
});

test("Recharts generated stroke defaults have a narrow exception", () => {
  assert.deepEqual(designColorLiteralErrors("src/components/ui/chart.tsx", "[stroke='#ccc'] [stroke='#fff']"), []);
  assert.equal(designColorLiteralErrors("src/components/ui/chart.tsx", "bg-[#ccc]").length, 1);
});

test("compatibility HEX and standalone icon stay equal to canonical OKLCH", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const compatibility = readFileSync("src/lib/color-compat.ts", "utf8");
  const icon = readFileSync("public/icon.svg", "utf8");
  assert.deepEqual(compatibilityColorErrors(css, compatibility, icon), []);
  assert.ok(compatibilityColorErrors(css, compatibility.replace("#ff4fa3", "#ff4fa4"), icon).length > 0);
  assert.ok(compatibilityColorErrors(css, `${compatibility}\nconst extra = "#123456";`, icon).length > 0);
});
