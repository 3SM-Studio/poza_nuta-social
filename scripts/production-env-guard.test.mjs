import assert from "node:assert/strict";
import test from "node:test";
import { productionEnvProblems } from "./production-env-guard.mjs";

const configured = () => ({
  VERCEL_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://pozanuta.pl",
});

test("local and preview builds do not require production credentials", () => {
  for (const VERCEL_ENV of [undefined, "preview", "development"]) assert.deepEqual(productionEnvProblems({ VERCEL_ENV }), []);
});
test("the approved future root origin passes", () => {
  assert.deepEqual(productionEnvProblems(configured()), []);
});
test("localhost, old subdomains and malformed origins fail", () => {
  for (const value of [undefined, "", "http://localhost:3000", "https://socials.pozanuta.pl", "https://pozanuta.pl/path", "https://pozanuta.pl/", "https://pozanuta.pl?x=1", "http://pozanuta.pl"]) {
    assert.ok(productionEnvProblems({ ...configured(), NEXT_PUBLIC_SITE_URL: value }).some((issue) => issue.startsWith("NEXT_PUBLIC_SITE_URL:")));
  }
});
test("guard output does not disclose configured values", () => {
  const problems = productionEnvProblems({ ...configured(), NEXT_PUBLIC_SITE_URL: "https://private-value.example" });
  assert.equal(problems.length, 1);
  assert.ok(!problems.join().includes("private-value"));
});
