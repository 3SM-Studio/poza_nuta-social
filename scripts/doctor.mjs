import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const requiredLocalNames = ["NEXT_PUBLIC_SUPABASE_URL"];
const productionNames = ["ANALYTICS_SIGNING_SECRET", "PRIVACY_CONTROLLER_NAME", "PRIVACY_CONTROLLER_ADDRESS", "PRIVACY_CONTACT_EMAIL", "PRIVACY_RECIPIENTS", "PRIVACY_TRANSFERS", "PRIVACY_RETENTION"];

export function assess(snapshot) {
  const rows = [];
  const add = (status, label, detail) => rows.push({ status, label, detail });
  const nodeMajor = Number(snapshot.nodeVersion.match(/^v?(\d+)\./)?.[1]);
  const requiredNode = Number(snapshot.requiredNode.match(/\d+/)?.[0]);
  const nodeReady = nodeMajor === requiredNode;
  add(nodeReady ? "READY" : "BLOCKING", "Node", `${snapshot.nodeVersion}; required ${snapshot.requiredNode} (basic source work)`);

  const npmReady = snapshot.npmVersion === snapshot.requiredNpm;
  add(npmReady ? "READY" : "BLOCKING", "npm", `${snapshot.npmVersion ?? "missing"}; required ${snapshot.requiredNpm} (basic source work)`);
  add(snapshot.dependencies ? "READY" : "BLOCKING", "Dependencies", snapshot.dependencies ? "installed for source work" : "run npm ci for source work");
  add(snapshot.gitAvailable ? "READY" : "BLOCKING", "Git", snapshot.gitAvailable ? "available" : "missing for repository work");
  add(snapshot.branch ? "READY" : "BLOCKING", "Git branch", snapshot.branch || "unknown");
  add("OPTIONAL", "Git upstream", snapshot.upstream || "absent; required only for tracking/push workflows");
  add("OPTIONAL", "Git working tree", snapshot.dirty === null ? "UNKNOWN; Git status unavailable" : snapshot.dirty ? "dirty; review before export or release" : "clean");

  add(snapshot.dockerAvailable ? "READY" : "BLOCKING", "Docker CLI", snapshot.dockerAvailable ? "available for local Supabase" : "missing; blocks local Supabase/DB/E2E, not basic source work");
  add(snapshot.dockerRunning ? "READY" : "BLOCKING", "Docker daemon", snapshot.dockerRunning ? "available locally" : "unavailable; blocks local Supabase/DB/E2E");
  add(snapshot.supabaseCli ? "READY" : "BLOCKING", "Supabase CLI", snapshot.supabaseCli ? "repo-local CLI installed" : "missing; run npm ci for local DB/E2E");
  add(snapshot.supabaseRunning ? "READY" : "BLOCKING", "Local Supabase", snapshot.supabaseRunning ? "running" : "stopped or status unavailable; local DB/E2E only");
  add(snapshot.playwrightPackage ? "READY" : "BLOCKING", "Playwright package", snapshot.playwrightPackage ? "installed" : "missing; browser tests only");
  add(snapshot.chromiumBrowser ? "READY" : "BLOCKING", "Chromium browser", snapshot.chromiumBrowser ? "installed" : "missing; Chromium browser tests only");
  add(snapshot.webkitBrowser ? "READY" : "BLOCKING", "WebKit browser", snapshot.webkitBrowser ? "installed" : "missing; WebKit browser tests only");

  for (const name of requiredLocalNames) add(snapshot.envNames.has(name) ? "READY" : "BLOCKING", name, snapshot.envNames.has(name) ? "name defined; value not checked" : "name missing; blocks Supabase-backed local app flows");
  for (const names of [["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"], ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]]) {
    const present = names.filter((name) => snapshot.envNames.has(name));
    add(present.length ? "READY" : "BLOCKING", names.join(" OR "), present.length ? `${present.join(" or ")}: name defined; value not checked` : "names missing; blocks relevant local Supabase/Admin flows");
  }
  add("OPTIONAL", "NEXT_PUBLIC_SITE_URL", snapshot.envNames.has("NEXT_PUBLIC_SITE_URL") ? "name defined; value not checked" : "missing; local fallback is http://localhost:3000");
  for (const name of productionNames) add("OPTIONAL", name, snapshot.envNames.has(name) ? "name defined; value not checked; Production not checked" : "name missing; Production readiness not checked");
  add("OPTIONAL", "Environment identity", "LOCAL checkout only; PREVIEW and PRODUCTION: UNKNOWN / NOT CHECKED");

  const basicReady = nodeReady && npmReady && snapshot.dependencies && snapshot.gitAvailable && Boolean(snapshot.branch);
  return { basicReady, rows };
}

export function collectSnapshot({ root, env, run, exists, read, nodeVersion }) {
  const packageJson = JSON.parse(read(join(root, "package.json")));
  const requiredNode = read(join(root, ".nvmrc")).trim();
  const requiredNpm = packageJson.packageManager.match(/^npm@(.+)$/)?.[1] ?? "unknown";
  const names = new Set(Object.keys(env));
  const envFile = join(root, ".env.local");
  if (exists(envFile)) {
    for (const line of read(envFile).split(/\r?\n/)) {
      const name = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/)?.[1];
      if (name) names.add(name);
    }
  }
  const npm = run("npm", ["--version"]);
  const git = run("git", ["--version"]);
  const branch = git.ok ? run("git", ["branch", "--show-current"]) : { ok: false, output: "" };
  const upstream = git.ok ? run("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]) : { ok: false, output: "" };
  const status = git.ok ? run("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"]) : { ok: false, output: "" };
  const docker = run("docker", ["--version"]);
  const daemon = docker.ok ? run("docker", ["info", "--format", "{{.ServerVersion}}"]) : { ok: false, output: "" };
  const cli = join(root, "node_modules", "supabase", "dist", "supabase.js");
  const supabaseCli = exists(cli);
  const localStatus = supabaseCli && daemon.ok ? run(process.execPath, [cli, "status", "-o", "json"]) : { ok: false, output: "" };
  const playwrightPackage = exists(join(root, "node_modules", "@playwright", "test", "package.json"));
  const browserCheck = playwrightPackage ? run(process.execPath, ["-e", "const {chromium,webkit}=require('playwright-core');const fs=require('node:fs');process.stdout.write(JSON.stringify({chromium:fs.existsSync(chromium.executablePath()),webkit:fs.existsSync(webkit.executablePath())}))"]) : { ok: false, output: "" };
  let browsers = {};
  if (browserCheck.ok) {
    try { browsers = JSON.parse(browserCheck.output); } catch { /* Treat unreadable runtime state as unavailable. */ }
  }
  return {
    nodeVersion,
    requiredNode,
    npmVersion: npm.ok ? npm.output.match(/^\d+\.\d+\.\d+/)?.[0] : null,
    requiredNpm,
    dependencies: ["next", "eslint", "typescript", "vitest"].every((name) => exists(join(root, "node_modules", name, "package.json"))),
    gitAvailable: git.ok,
    branch: branch.ok ? branch.output.trim() : "",
    upstream: upstream.ok ? upstream.output.trim() : "",
    dirty: status.ok ? Boolean(status.output) : null,
    dockerAvailable: docker.ok,
    dockerRunning: daemon.ok,
    supabaseCli,
    supabaseRunning: localStatus.ok,
    playwrightPackage,
    chromiumBrowser: Boolean(browsers.chromium),
    webkitBrowser: Boolean(browsers.webkit),
    envNames: names,
  };
}

function runCommand(command, args) {
  const windowsNpm = process.platform === "win32" && command === "npm";
  const result = spawnSync(windowsNpm ? "cmd.exe" : command, windowsNpm ? ["/d", "/s", "/c", "npm --version"] : args, { cwd: process.cwd(), encoding: "utf8", timeout: 5000, windowsHide: true });
  return { ok: result.status === 0, output: result.stdout ?? "" };
}

function main() {
  const snapshot = collectSnapshot({ root: process.cwd(), env: process.env, run: runCommand, exists: existsSync, read: (path) => readFileSync(path, "utf8"), nodeVersion: process.version });
  const result = assess(snapshot);
  console.log("Environment doctor — read-only local preflight");
  for (const row of result.rows) console.log(`${row.status}: ${row.label} — ${row.detail}`);
  console.log(`BASIC SOURCE WORK: ${result.basicReady ? "READY" : "BLOCKING"}`);
  if (!result.basicReady) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
