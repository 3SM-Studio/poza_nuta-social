import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const windows = process.platform === "win32";
const launcher = resolve(`.agents/skills/impeccable/scripts/impeccable${windows ? ".cmd" : ""}`);
const result = windows
  ? spawnSync("cmd.exe", ["/d", "/c", launcher, "detect", "src/"], { stdio: "inherit" })
  : spawnSync("sh", [launcher, "detect", "src/"], { stdio: "inherit" });

if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
