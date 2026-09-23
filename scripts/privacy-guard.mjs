import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const targets = ["src", "supabase"];
const files = targets.flatMap((dir) => walk(join(root, dir))).filter((file) => /\.(?:ts|tsx|js|mjs|sql)$/.test(file));
const forbidden = [
  [/x-forwarded-for/i, "raw proxy IP collection"],
  [/cf-connecting-ip/i, "raw Cloudflare IP collection"],
  [/request\.ip\b/i, "raw request IP collection"],
  [/fingerprintjs|fingerprint2|clientjs/i, "browser fingerprinting dependency/code"],
  [/navigator\.geolocation/i, "precise browser geolocation"],
  [/pn_attr/i, "retired persistent attribution cookie"],
];

const findings = [];
for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const [pattern, reason] of forbidden) {
    if (pattern.test(content)) findings.push(`${relative(root, file)}: ${reason}`);
  }
}
if (findings.length) {
  console.error("privacy-guard: failed\n" + findings.map((x) => `- ${x}`).join("\n"));
  process.exit(1);
}
console.log("privacy-guard: ok");

function walk(path) {
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  return readdirSync(path).flatMap((entry) => walk(join(path, entry)));
}
