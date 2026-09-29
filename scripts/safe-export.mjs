import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const gitText = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const gitBytes = (...args) => execFileSync("git", args, { cwd: root, encoding: "buffer" });

if (gitBytes("status", "--porcelain=v1", "-z", "--untracked-files=all").length) {
  console.error("safe-export: working tree/index is dirty. Commit intended changes first, or explicitly export the previously committed HEAD from a clean checkout.");
  process.exit(1);
}

const head = gitText("rev-parse", "--verify", "HEAD");
const shortSha = head.slice(0, 12);
const target = resolve(root, "..", `pozanuta-social-${shortSha}.zip`);
if (existsSync(target)) {
  console.error(`safe-export: output already exists: ${target}`);
  process.exit(1);
}

const paths = gitBytes("ls-tree", "-r", "-z", "--name-only", "HEAD").toString("utf8").split("\0").filter(Boolean);
const forbidden = paths.filter(isForbidden);
if (forbidden.length) {
  console.error(`safe-export: forbidden tracked path(s):\n${forbidden.map((x) => `- ${x}`).join("\n")}`);
  process.exit(1);
}

execFileSync(process.execPath, [fileURLToPath(new URL("./secret-guard.mjs", import.meta.url))], { cwd: root, stdio: "inherit" });
const tempDir = mkdtempSync(join(dirname(target), ".safe-export-"));
const tempArchive = join(tempDir, "archive.zip");
try {
  execFileSync("git", ["archive", "--format=zip", `--output=${tempArchive}`, head], { cwd: root });
  const listing = process.platform === "win32"
    ? execFileSync("tar", ["-tf", tempArchive], { encoding: "utf8" })
    : execFileSync("unzip", ["-Z", "-1", tempArchive], { encoding: "utf8" });
  const entries = listing.split(/\r?\n/).filter(Boolean);
  if (entries.length === 0) throw new Error("archive is empty");
  const escaped = entries.filter(isForbidden);
  if (escaped.length) throw new Error(`forbidden archive path(s): ${escaped.join(", ")}`);
  if (existsSync(target)) throw new Error(`output already exists: ${target}`);
  renameSync(tempArchive, target);
  console.log(`safe-export: ${basename(target)} (${shortSha}; ${entries.length} entries; tracked HEAD only)`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function isForbidden(path) {
  const parts = path.replaceAll("\\", "/").split("/").map((part) => part.toLowerCase());
  return parts.some((part) =>
    (part.startsWith(".env") && part !== ".env.example") ||
    [".git", ".vercel", "node_modules", ".next", ".cache", ".turbo", "out", "coverage", "test-results", "playwright-report", ".temp", ".branches", "__pycache__"].includes(part)
  );
}
