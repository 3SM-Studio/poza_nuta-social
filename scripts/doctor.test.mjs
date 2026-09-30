import assert from "node:assert/strict";
import test from "node:test";
import { assess, collectSnapshot } from "./doctor.mjs";

const fakeSecret = "synthetic-value-never-print";

function snapshot(overrides = {}) {
  return {
    nodeVersion: "v24.19.0", requiredNode: "24", npmVersion: "11.17.0", requiredNpm: "11.17.0",
    dependencies: true, gitAvailable: true, branch: "example/branch", upstream: "", dirty: false,
    dockerAvailable: false, dockerRunning: false, supabaseCli: false, supabaseRunning: false,
    playwrightPackage: false, chromiumBrowser: false, webkitBrowser: false,
    envNames: new Set(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]),
    ...overrides,
  };
}

test("compatible runtime is ready despite optional local tooling being absent", () => {
  const result = assess(snapshot());
  assert.equal(result.basicReady, true);
  assert.equal(result.rows.find((row) => row.label === "Node").status, "READY");
  assert.match(result.rows.find((row) => row.label === "Docker CLI").detail, /local Supabase\/DB\/E2E/);
});

test("incompatible runtime blocks basic source work", () => {
  const result = assess(snapshot({ nodeVersion: "v22.0.0", npmVersion: "10.0.0" }));
  assert.equal(result.basicReady, false);
  assert.equal(result.rows.find((row) => row.label === "Node").status, "BLOCKING");
  assert.equal(result.rows.find((row) => row.label === "npm").status, "BLOCKING");
});

test("environment names and dirty Git state are reported without values", () => {
  const result = assess(snapshot({ dirty: true, envNames: new Set(["SUPABASE_SECRET_KEY"]) }));
  const output = JSON.stringify(result);
  assert.match(output, /Git working tree.*dirty/);
  assert.match(output, /NEXT_PUBLIC_SUPABASE_URL.*missing/);
  assert.match(output, /SUPABASE_SECRET_KEY.*name defined/);
  assert.doesNotMatch(output, new RegExp(fakeSecret));
});

test("snapshot collection invokes only read-only commands and retains env names only", () => {
  const calls = [];
  const root = "/synthetic/repo";
  const run = (command, args) => {
    calls.push(`${command} ${args.join(" ")}`);
    if (command === "npm") return { ok: true, output: "11.17.0\n" };
    if (command === "git" && args[0] === "branch") return { ok: true, output: "example/branch\n" };
    if (command === "git" && args[0] === "status") return { ok: true, output: " M README.md\0" };
    if (command === "git" && args[0] === "rev-parse") return { ok: false, output: "" };
    if (command === "docker") return { ok: false, output: "" };
    return { ok: true, output: "git version 2.0\n" };
  };
  const result = collectSnapshot({
    root, env: { SUPABASE_SECRET_KEY: fakeSecret }, run,
    exists: (path) => path.endsWith(".env.local") || path.endsWith("next/package.json"),
    read: (path) => path.endsWith("package.json") ? JSON.stringify({ packageManager: "npm@11.17.0" }) : path.endsWith(".nvmrc") ? "24\n" : `NEXT_PUBLIC_SUPABASE_URL=${fakeSecret}\n`,
    nodeVersion: "v24.19.0",
  });
  assert.equal(result.dirty, true);
  assert.equal(result.envNames.has("SUPABASE_SECRET_KEY"), true);
  assert.equal(result.envNames.has("NEXT_PUBLIC_SUPABASE_URL"), true);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(fakeSecret));
  assert.equal(calls.some((call) => /\b(start|stop|reset|install|push|pull|migrate)\b/.test(call)), false);
  assert.equal(calls.some((call) => call.includes("supabase status")), false);
});
