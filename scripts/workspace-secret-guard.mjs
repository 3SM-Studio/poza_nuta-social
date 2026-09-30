import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const findings = [];
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (entry.name.startsWith(".env") && entry.name !== ".env.example") {
    findings.push(`${entry.name}: local environment file`);
  }
}

for (const directory of [".vercel", "supabase/.temp"]) {
  try {
    if (statSync(join(root, directory)).isDirectory()) findings.push(`${directory}/: local tool state`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

if (findings.length) {
  console.error(`workspace-secret-guard: unsafe to archive the whole workspace\n${findings.map((x) => `- ${x}`).join("\n")}`);
  process.exit(1);
}
console.log("workspace-secret-guard: no selected local secret-bearing surfaces found");
