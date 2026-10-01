import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const entryDocs = [
  "AGENTS.md",
  "README.md",
  "docs/INDEX.md",
  "docs/VERIFY.md",
  "docs/RELEASE.md",
  "docs/current/README.md",
];
const workHeadings = [
  "Outcome",
  "Working branch",
  "Baseline and current state",
  "Remaining work",
  "Completed verification",
  "NOT VERIFIED / blockers",
  "Authority boundary",
];

function trackedPaths(root) {
  return new Set(execFileSync("git", ["ls-files", "--cached", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0").filter(Boolean).map((path) => path.replaceAll("\\", "/")));
}

function markdownTargets(source) {
  return [...source.matchAll(/\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']+["'])?\)/g)]
    .map((match) => match[1] ?? match[2]);
}

function localTarget(root, sourcePath, rawTarget) {
  const path = rawTarget.split(/[?#]/, 1)[0];
  if (!path || /^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i.test(path)) return null;
  let decoded;
  try { decoded = decodeURIComponent(path); } catch { return { error: `invalid link '${rawTarget}'` }; }
  if (isAbsolute(decoded)) return { error: `absolute local link '${rawTarget}'` };
  const absolute = resolve(root, dirname(sourcePath), decoded);
  const repoPath = relative(root, absolute).replaceAll("\\", "/");
  if (!repoPath || repoPath === ".." || repoPath.startsWith("../")) return { error: `link escapes repository '${rawTarget}'` };
  return { absolute, repoPath };
}

function sectionBodies(source) {
  const sections = new Map();
  const lines = source.split(/\r?\n/);
  let heading;
  for (const line of lines) {
    const next = /^## (.+?)\s*$/.exec(line);
    if (next) {
      heading = next[1];
      if (!sections.has(heading)) sections.set(heading, []);
    } else if (heading) {
      sections.get(heading).push(line);
    }
  }
  return sections;
}

export function docsIntegrityProblems(repoRoot = process.cwd(), { trackedFiles } = {}) {
  const root = resolve(repoRoot);
  const problems = [];
  const tracked = trackedFiles ? new Set(trackedFiles) : trackedPaths(root);
  const sources = new Map();

  for (const path of entryDocs) {
    const absolute = join(root, path);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      problems.push(`${path}: required entry document is missing`);
      continue;
    }
    if (!tracked.has(path)) problems.push(`${path}: entry document is not Git-tracked`);
    sources.set(path, readFileSync(absolute, "utf8"));
  }

  for (const [sourcePath, source] of sources) {
    for (const rawTarget of markdownTargets(source)) {
      const target = localTarget(root, sourcePath, rawTarget);
      if (!target) continue;
      if (target.error) { problems.push(`${sourcePath}: ${target.error}`); continue; }
      if (!existsSync(target.absolute) || !statSync(target.absolute).isFile()) {
        problems.push(`${sourcePath}: link '${rawTarget}' points to a missing file`);
      } else if (!tracked.has(target.repoPath)) {
        problems.push(`${sourcePath}: link '${rawTarget}' points to an untracked file`);
      }
    }
  }

  const index = sources.get("docs/INDEX.md") ?? "";
  const canonical = new Map();
  let currentRows = 0;
  for (const line of index.split(/\r?\n/)) {
    const row = /^\|\s*(CANONICAL|CURRENT|HISTORICAL|EVIDENCE)\s*\|[^|]*\|\s*(.*?)\s*\|\s*$/.exec(line);
    if (!row) continue;
    const [, role, content] = row;
    const paths = markdownTargets(content).map((raw) => localTarget(root, "docs/INDEX.md", raw))
      .filter((target) => target && !target.error).map((target) => target.repoPath);
    if (role === "CANONICAL") {
      if (paths.length !== 1) problems.push(`docs/INDEX.md: each CANONICAL row needs exactly one local Markdown link`);
      for (const path of paths) canonical.set(path, (canonical.get(path) ?? 0) + 1);
    }
    if (role === "CURRENT") currentRows++;
    if (role !== "HISTORICAL" && paths.includes("docs/RELEASE_CHECKLIST.md")) {
      problems.push("docs/INDEX.md: legacy release checklist may only have a HISTORICAL role");
    }
    if ((role === "CANONICAL" || role === "CURRENT") && paths.some((path) => /(?:^|\/)RELEASE[^/]*\.md$/i.test(path) && path !== "docs/RELEASE.md")) {
      problems.push("docs/INDEX.md: docs/RELEASE.md is the only current canonical release procedure");
    }
  }
  if (!canonical.size) problems.push("docs/INDEX.md: no CANONICAL rows found");
  if (!currentRows) problems.push("docs/INDEX.md: no CURRENT task-state row found");
  for (const path of ["docs/VERIFY.md", "docs/RELEASE.md", "docs/current/README.md"]) {
    if (canonical.get(path) !== 1) problems.push(`docs/INDEX.md: ${path} must appear exactly once as CANONICAL`);
  }
  for (const [path, count] of canonical) {
    if (count > 1) problems.push(`docs/INDEX.md: duplicate CANONICAL source ${path}`);
    if (!existsSync(join(root, path))) problems.push(`docs/INDEX.md: missing CANONICAL document ${path}`);
    if (/\bVERIFY[^/]*\.md$/i.test(path) && path !== "docs/VERIFY.md") problems.push(`docs/INDEX.md: docs/VERIFY.md is the canonical verification contract`);
  }

  for (const path of entryDocs.filter((path) => path !== "docs/INDEX.md")) {
    const source = sources.get(path) ?? "";
    if (source.includes("RELEASE_CHECKLIST.md")) problems.push(`${path}: legacy release checklist must not be an active entry point`);
    if (source.includes("CODEX_HANDOFF.md")) problems.push(`${path}: legacy root handoff must not be an active entry point`);
  }
  for (const name of readdirSync(root)) {
    if (/handoff/i.test(name) && name.endsWith(".md")) problems.push(`${name}: active root handoff conflicts with docs/current convention`);
  }
  const currentDir = join(root, "docs", "current");
  if (existsSync(currentDir)) {
    for (const name of readdirSync(currentDir)) {
      if (/handoff/i.test(name) && name.endsWith(".md")) problems.push(`docs/current/${name}: competing current handoff`);
    }
  }

  const workPath = "docs/current/WORK.md";
  if (existsSync(join(root, workPath))) {
    if (!tracked.has(workPath)) problems.push(`${workPath}: current-work note is not Git-tracked`);
    const sections = sectionBodies(readFileSync(join(root, workPath), "utf8"));
    for (const heading of workHeadings) {
      const body = sections.get(heading)?.join("\n").trim() ?? "";
      if (!body || /\b(?:TODO|TBD|FIXME)\b|<[^>]+>/i.test(body)) {
        problems.push(`${workPath}: section '${heading}' is missing or contains a placeholder`);
      }
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const problems = docsIntegrityProblems();
    if (problems.length) {
      console.error("docs-integrity-guard: failed\n" + problems.map((problem) => `- ${problem}`).join("\n"));
      process.exitCode = 1;
    } else {
      console.log("docs-integrity-guard: ok");
    }
  } catch (error) {
    console.error(`docs-integrity-guard: failed to inspect Git: ${error.message}`);
    process.exitCode = 1;
  }
}
