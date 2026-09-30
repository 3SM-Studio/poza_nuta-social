import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const secretGuard = fileURLToPath(new URL("./secret-guard.mjs", import.meta.url));
const workspaceGuard = fileURLToPath(new URL("./workspace-secret-guard.mjs", import.meta.url));
const safeExport = fileURLToPath(new URL("./safe-export.mjs", import.meta.url));
const fakeSecret = "sb_secret_" + "A".repeat(24);

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}

function fixture() {
  const temp = mkdtempSync(join(tmpdir(), "pozanuta-secrets-test-"));
  const repo = join(temp, "repo");
  mkdirSync(repo);
  assert.equal(run("git", ["init", "-q"], repo).status, 0);
  return { temp, repo, cleanup: () => rmSync(temp, { recursive: true, force: true }) };
}

function commit(repo) {
  assert.equal(run("git", ["add", "-A"], repo).status, 0);
  assert.equal(run("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "fixture"], repo).status, 0);
}

test("tracked scan covers safe files and credentials outside the former directory list without disclosing values", () => {
  const { repo, cleanup } = fixture();
  try {
    mkdirSync(join(repo, "new-area"));
    writeFileSync(join(repo, "new-area", "safe.txt"), "ordinary tracked text\n");
    writeFileSync(join(repo, "new-area", "binary.bin"), Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(fakeSecret)]));
    assert.equal(run("git", ["add", "-A"], repo).status, 0);
    assert.equal(run(process.execPath, [secretGuard], repo).status, 0);

    writeFileSync(join(repo, "new-area", "credential.txt"), `${fakeSecret}\n`);
    assert.equal(run("git", ["add", "-A"], repo).status, 0);
    const result = run(process.execPath, [secretGuard], repo);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /new-area\/credential\.txt:1: secret API key/);
    assert.doesNotMatch(result.output, new RegExp(fakeSecret));
  } finally {
    cleanup();
  }
});

test("workspace inspection reports local secret-bearing surfaces without reading out values", () => {
  const { repo, cleanup } = fixture();
  try {
    writeFileSync(join(repo, ".env.example"), "SAFE=placeholder\n");
    assert.equal(run(process.execPath, [workspaceGuard], repo).status, 0);
    writeFileSync(join(repo, ".env.local"), `SUPABASE_SECRET_KEY=${fakeSecret}\n`);
    mkdirSync(join(repo, ".vercel"));
    writeFileSync(join(repo, ".vercel", "project.json"), "{}\n");
    const result = run(process.execPath, [workspaceGuard], repo);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /\.env\.local: local environment file/);
    assert.match(result.output, /\.vercel\/: local tool state/);
    assert.doesNotMatch(result.output, new RegExp(fakeSecret));
  } finally {
    cleanup();
  }
});

test("safe export refuses dirty state and produces an inspected committed archive", () => {
  const { temp, repo, cleanup } = fixture();
  try {
    writeFileSync(join(repo, ".gitignore"), ".env*\n!.env.example\n.vercel\nnode_modules\n.next\n");
    writeFileSync(join(repo, ".env.example"), "SAFE=placeholder\n");
    writeFileSync(join(repo, "source.txt"), "committed source\n");
    commit(repo);
    writeFileSync(join(repo, "untracked.txt"), "not committed\n");
    const dirty = run(process.execPath, [safeExport], repo);
    assert.notEqual(dirty.status, 0);
    assert.match(dirty.output, /working tree\/index is dirty/);
    rmSync(join(repo, "untracked.txt"));
    writeFileSync(join(repo, "staged.txt"), "staged source\n");
    assert.equal(run("git", ["add", "staged.txt"], repo).status, 0);
    assert.match(run(process.execPath, [safeExport], repo).output, /working tree\/index is dirty/);
    commit(repo);
    writeFileSync(join(repo, ".env.local"), `SUPABASE_SECRET_KEY=${fakeSecret}\n`);
    mkdirSync(join(repo, ".vercel"));
    writeFileSync(join(repo, ".vercel", "project.json"), "{}\n");
    mkdirSync(join(repo, "node_modules"));
    writeFileSync(join(repo, "node_modules", "cache.txt"), "ignored\n");
    mkdirSync(join(repo, ".next"));
    writeFileSync(join(repo, ".next", "cache.txt"), "ignored\n");
    const clean = run(process.execPath, [safeExport], repo);
    assert.equal(clean.status, 0, clean.output);
    const sha = run("git", ["rev-parse", "--short=12", "HEAD"], repo).output.trim();
    const archive = join(temp, `pozanuta-social-${sha}.zip`);
    const listing = process.platform === "win32"
      ? run("tar", ["-tf", archive], repo)
      : run("unzip", ["-Z", "-1", archive], repo);
    assert.equal(listing.status, 0, listing.output);
    assert.match(listing.output, /source\.txt/);
    assert.match(listing.output, /\.env\.example/);
    assert.doesNotMatch(listing.output, /\.env\.local|\.vercel|node_modules|\.next|\.git\//);
    assert.equal(readFileSync(join(repo, "source.txt"), "utf8"), "committed source\n");
  } finally {
    cleanup();
  }
});

test("safe export refuses a committed secret-bearing path", () => {
  const { repo, cleanup } = fixture();
  try {
    writeFileSync(join(repo, ".env.local"), "PLACEHOLDER=not-a-secret\n");
    commit(repo);
    const result = run(process.execPath, [safeExport], repo);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /forbidden tracked path/);
  } finally {
    cleanup();
  }
});
