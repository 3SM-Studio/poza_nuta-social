import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { docsIntegrityProblems } from "./docs-integrity-guard.mjs";

const index = `# Documentation map
| Role | Area | Source |
| --- | --- | --- |
| CANONICAL | Verification | [VERIFY](VERIFY.md) |
| CANONICAL | Release | [RELEASE](RELEASE.md) |
| CANONICAL | Work convention | [README](current/README.md) |
| CURRENT | Task state | Git is authoritative; optional work note. |
| HISTORICAL | Checklist | [old checklist](RELEASE_CHECKLIST.md) |
| HISTORICAL | Handoff | [archive](history/CODEX_HANDOFF_2026-09-27.md) |
`;

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "docs-integrity-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, content) => {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, content);
  };
  write("AGENTS.md", "# Agents\nUse docs/INDEX.md.\n");
  write("README.md", "# Repo\n[map](docs/INDEX.md)\n");
  write("docs/INDEX.md", index);
  write("docs/VERIFY.md", "# Verification\n[release](RELEASE.md)\n");
  write("docs/RELEASE.md", "# Release\n[verification](VERIFY.md)\n");
  write("docs/current/README.md", "# Optional work\n[index](../INDEX.md)\n");
  write("docs/RELEASE_CHECKLIST.md", "# Historical checklist\n");
  write("docs/history/CODEX_HANDOFF_2026-09-27.md", "# Historical handoff\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "-A"], { cwd: root });
  return { root, write };
}

test("valid canonical map passes with optional current work absent", (t) => {
  const { root } = fixture(t);
  assert.deepEqual(docsIntegrityProblems(root), []);
});

test("broken and untracked canonical-entry links fail", (t) => {
  const { root, write } = fixture(t);
  write("README.md", "[broken](docs/missing.md)\n");
  assert.match(docsIntegrityProblems(root).join("\n"), /missing file/);
  write("docs/missing.md", "# Exists but is not tracked\n");
  assert.match(docsIntegrityProblems(root).join("\n"), /untracked file/);
});

test("broken canonical INDEX link fails", (t) => {
  const { root, write } = fixture(t);
  write("docs/INDEX.md", index.replace("[VERIFY](VERIFY.md)", "[VERIFY](absent.md)"));
  const problems = docsIntegrityProblems(root).join("\n");
  assert.match(problems, /link 'absent\.md' points to a missing file/);
  assert.match(problems, /docs\/VERIFY\.md must appear exactly once as CANONICAL/);
});

test("missing canonical document fails", (t) => {
  const { root } = fixture(t);
  rmSync(join(root, "docs", "VERIFY.md"));
  const problems = docsIntegrityProblems(root).join("\n");
  assert.match(problems, /required entry document is missing/);
  assert.match(problems, /missing CANONICAL document docs\/VERIFY\.md/);
});

test("historical release checklist cannot be a CURRENT or CANONICAL procedure", (t) => {
  const { root, write } = fixture(t);
  write("docs/INDEX.md", index.replace("| HISTORICAL | Checklist", "| CURRENT | Checklist"));
  assert.match(docsIntegrityProblems(root).join("\n"), /legacy release checklist may only have a HISTORICAL role/);
  write("docs/INDEX.md", index.replace("| HISTORICAL | Checklist", "| CANONICAL | Checklist"));
  assert.match(docsIntegrityProblems(root).join("\n"), /docs\/RELEASE\.md is the only current canonical release procedure/);
});

test("optional current work passes when complete and fails on missing or placeholder fields", (t) => {
  const { root, write } = fixture(t);
  const work = `# Current work
## Outcome
Finish a bounded docs slice.
## Working branch
feature/docs-integrity
## Baseline and current state
main at abc123; feature branch has two commits.
## Remaining work
Review and merge the PR.
## Completed verification
Focused guard tests passed.
## NOT VERIFIED / blockers
Hosted CI is pending.
## Authority boundary
Git and canonical docs override this note.
`;
  write("docs/current/WORK.md", work);
  execFileSync("git", ["add", "docs/current/WORK.md"], { cwd: root });
  assert.deepEqual(docsIntegrityProblems(root), []);
  write("docs/current/WORK.md", work.replace("Hosted CI is pending.", "TODO"));
  assert.match(docsIntegrityProblems(root).join("\n"), /NOT VERIFIED \/ blockers.*placeholder/);
  write("docs/current/WORK.md", work.replace("Review and merge the PR.", ""));
  assert.match(docsIntegrityProblems(root).join("\n"), /Remaining work.*missing/);
});

test("active legacy handoff conflicts with current-work convention", (t) => {
  const { root, write } = fixture(t);
  write("CODEX_HANDOFF.md", "# Old active handoff\n");
  assert.match(docsIntegrityProblems(root).join("\n"), /active root handoff conflicts/);
  rmSync(join(root, "CODEX_HANDOFF.md"));
  write("HANDOFF.md", "# Another active handoff\n");
  assert.match(docsIntegrityProblems(root).join("\n"), /active root handoff conflicts/);
});
