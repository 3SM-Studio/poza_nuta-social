import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function skillIntegrityProblems(repoRoot = process.cwd()) {
  const skillsRoot = join(repoRoot, ".agents", "skills");
  if (!existsSync(skillsRoot)) return [".agents/skills: repo-local skill directory is missing"];

  const problems = [];
  const skills = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const skill of skills) {
    const skillDir = join(skillsRoot, skill);
    const skillFile = join(skillDir, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    const source = readFileSync(skillFile, "utf8");
    const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source)?.[1];
    for (const field of ["name", "description"]) {
      if (!frontMatter || !new RegExp(`^${field}:[ \\t]*\\S`, "m").test(frontMatter)) {
        problems.push(`${skill}/SKILL.md: missing front matter field '${field}'`);
      }
    }

    const references = new Set();
    for (const match of source.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].split(/[\s#?]/, 1)[0];
      if (target && !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(target)) references.add(target);
    }
    for (const match of source.matchAll(/\b((?:reference|references|assets|scripts)\/[\w./-]+\.[A-Za-z\d]+)\b/g)) {
      references.add(match[1]);
    }

    for (const reference of [...references].sort()) {
      let target;
      try {
        target = resolve(skillDir, decodeURIComponent(reference));
      } catch {
        problems.push(`${skill}/SKILL.md: invalid local reference '${reference}'`);
        continue;
      }
      if (!existsSync(target) || !statSync(target).isFile()) {
        problems.push(`${skill}/SKILL.md: missing local reference '${reference}'`);
      }
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = skillIntegrityProblems();
  if (problems.length) {
    console.error("skill-integrity-guard: failed\n" + problems.map((problem) => `- ${problem}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("skill-integrity-guard: ok");
  }
}
