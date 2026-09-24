import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const errors = [];
function inspect(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) inspect(path);
    else if (/\.[jt]sx?$/.test(entry)) {
      const source = readFileSync(path, "utf8");
      if (source.includes("/api/track")) errors.push(`${path}: public consumer bypasses analytics SDK`);
    }
  }
}
inspect("src/components");
inspect("src/app/(public)");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("analytics-guard: ok");
