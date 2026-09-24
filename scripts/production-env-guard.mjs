// Validate the canonical origin at build time without printing environment values.
// The existing NEXT_PUBLIC_SITE_URL contract remains the single source for URLs.
export function productionEnvProblems(env) {
  if (env.VERCEL_ENV !== "production") return [];
  const origin = env.NEXT_PUBLIC_SITE_URL;
  const problems = origin === "https://pozanuta.pl" ? [] : ["NEXT_PUBLIC_SITE_URL: expected the approved HTTPS root origin without path, query or trailing slash"];
  for (const name of ["PRIVACY_CONTROLLER_NAME", "PRIVACY_CONTROLLER_ADDRESS", "PRIVACY_CONTACT_EMAIL", "PRIVACY_RECIPIENTS", "PRIVACY_TRANSFERS", "PRIVACY_RETENTION"]) {
    const value = env[name]?.trim();
    if (!value || /^(?:todo|tbd|placeholder|unknown|n\/a)$/i.test(value)) problems.push(`${name}: confirmed publication value required`);
  }
  if (env.PRIVACY_CONTACT_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.PRIVACY_CONTACT_EMAIL.trim())) problems.push("PRIVACY_CONTACT_EMAIL: valid email required");
  return problems;
}

import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = productionEnvProblems(process.env);
  if (problems.length) {
    console.error(`production-env-guard: failed\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`production-env-guard: ${process.env.VERCEL_ENV === "production" ? "canonical origin and privacy disclosure configured; live deployment still requires verification" : "not a Vercel production build"}`);
  }
}
