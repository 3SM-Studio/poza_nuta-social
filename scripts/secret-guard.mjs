import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const roots = ["src", "scripts", "supabase", "docs", ".github", ".env.example", "README.md", "CODEX_HANDOFF.md"];
const ignored = new Set(["node_modules", ".next", ".git", "test-results", "playwright-report", ".temp"]);
const patterns = [
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
  [/\b(?:sb_secret_|sk_live_|sk_test_)[A-Za-z0-9_-]{16,}\b/, "secret API key"],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{20,}\b/, "JWT-like credential"],
  [/^SUPABASE_SERVICE_ROLE_KEY=[ \t]*[A-Za-z0-9._-]{8,}[ \t]*$/m, "populated service-role key"],
  [/^SUPABASE_SECRET_KEY=[ \t]*[A-Za-z0-9._-]{8,}[ \t]*$/m, "populated Supabase secret key"],
  [/^ANALYTICS_SIGNING_SECRET=[ \t]*[A-Za-z0-9._-]{8,}[ \t]*$/m, "populated analytics signing secret"],
];
const findings = [];
for (const root of roots) {
  if (!existsSync(root)) continue;
  for (const file of walk(root)) {
    if (/\.(?:png|jpe?g|gif|webp|woff2|lock)$/i.test(file)) continue;
    const content = readFileSync(file, "utf8");
    for (const [pattern, label] of patterns) if (pattern.test(content)) findings.push(`${relative(process.cwd(), file)}: ${label}`);
  }
}
if (findings.length) { console.error(`secret-guard: failed\n${findings.map((x) => `- ${x}`).join("\n")}`); process.exit(1); }
console.log("secret-guard: ok");

function walk(path) {
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  return readdirSync(path).filter((name) => !ignored.has(name)).flatMap((name) => walk(join(path, name)));
}
