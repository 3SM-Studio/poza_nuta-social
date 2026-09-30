import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { scanFile } from "./secret-scan-core.mjs";

const files = execFileSync("git", ["ls-files", "-z", "--cached"], { encoding: "buffer" })
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

const findings = [];
for (const file of files) findings.push(...scanFile(file, readFileSync(file)));

if (findings.length) {
  console.error(`secret-guard: failed\n${findings.map(({ file, line, type }) => `- ${file}:${line}: ${type}`).join("\n")}`);
  process.exit(1);
}
console.log("secret-guard: ok");
