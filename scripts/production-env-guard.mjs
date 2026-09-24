// Validate the canonical origin at build time without printing environment values.
// The existing NEXT_PUBLIC_SITE_URL contract remains the single source for URLs.
export function productionEnvProblems(env) {
  if (env.VERCEL_ENV !== "production") return [];
  const origin = env.NEXT_PUBLIC_SITE_URL;
  if (origin === "https://pozanuta.pl") return [];
  return ["NEXT_PUBLIC_SITE_URL: expected the approved HTTPS root origin without path, query or trailing slash"];
}

import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = productionEnvProblems(process.env);
  if (problems.length) {
    console.error(`production-env-guard: failed\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`production-env-guard: ${process.env.VERCEL_ENV === "production" ? "canonical origin ok; live deployment still requires verification" : "not a Vercel production build"}`);
  }
}
