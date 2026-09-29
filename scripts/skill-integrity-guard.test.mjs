import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { skillIntegrityProblems } from "./skill-integrity-guard.mjs";

test("repo-local skill references and required front matter are checked", (t) => {
  const repoRoot = mkdtempSync(join(tmpdir(), "skill-integrity-guard-"));
  assert.equal(dirname(repoRoot), resolve(tmpdir()));
  t.after(() => rmSync(repoRoot, { recursive: true, force: true }));

  const skillDir = join(repoRoot, ".agents", "skills", "example");
  mkdirSync(join(skillDir, "references"), { recursive: true });
  const skillFile = join(skillDir, "SKILL.md");
  const referenceFile = join(skillDir, "references", "guide.md");
  writeFileSync(skillFile, "---\nname: example\ndescription: Example skill\n---\n\nRead `references/guide.md`.\n");
  writeFileSync(referenceFile, "# Guide\n");
  assert.deepEqual(skillIntegrityProblems(repoRoot), []);

  rmSync(referenceFile);
  assert.deepEqual(skillIntegrityProblems(repoRoot), [
    "example/SKILL.md: missing local reference 'references/guide.md'",
  ]);

  writeFileSync(skillFile, "---\nname: example\n---\n");
  assert.deepEqual(skillIntegrityProblems(repoRoot), [
    "example/SKILL.md: missing front matter field 'description'",
  ]);
});
