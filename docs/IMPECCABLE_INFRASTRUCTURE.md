# Impeccable infrastructure

## Execution contract

The project skill at `.agents/skills/impeccable/` is the canonical Impeccable installation (skill 4.3.1, bundled engine 0.1.5). On Windows run `scripts/impeccable.cmd`; on other platforms run `scripts/impeccable`. `npm run impeccable:detect` delegates to that launcher through `scripts/impeccable-detect.mjs`. The separate `impeccable` npm package was removed: its 4.1.0 package version described a second launcher, despite currently resolving to the same 0.1.5 engine. Do not use `npx impeccable` to administer this project.

`npm run verify:source` includes the detector. Its exit code is passed through to npm; it is not suppressed.

## Hook and config

`.codex/hooks.json` contains the current engine's Codex model: `PostToolUse` for immediate rules and `Stop` for the deep pass. Both call the project launcher. The Windows command is a quote-free relative `.cmd` path, verified under both `cmd.exe` and PowerShell. The previous `if exist ... (& exit /b)` command produced exit code 1 under PowerShell (`Missing '(' after 'if'`), reproducing the reported failure mechanism. A fresh engine-generated command with a leading quoted path also failed in the `cmd.exe /s /c` harness; this repository uses the shell-compatible path form instead. Keep both events if regenerating the manifest.

The tracked `.impeccable/config.json` sets `buildPath: "comp"` for future visual-world work, enables the hook and design-system detector, and writes audit events to the ignored `.impeccable/hook-audit.ndjson`. Local consent and preferences belong in the ignored `config.local.json`. `impeccable doctor --json` currently reports no findings. `.impeccable/design.json` remains absent: the current engine does not require it for context, doctor, hooks or detection, and generating it from the incumbent Digital Music Editorial would prematurely grant that visual world replacement authority. Surface briefs can be tracked when an approved future direction creates them.

## Artifact boundary

- **Active shared:** `.impeccable/config.json` and future surface briefs, design sidecar, and review metadata when approved.
- **Historical shared:** existing `.impeccable/critique/*.md` reports, retained as dated evidence rather than current instructions.
- **Local or ephemeral:** `config.local.json`, hook cache and audit log, exploration, live and review outputs, and `local-baseline/` PNG evidence. `.gitignore` names these locations individually.

## Baseline and controlled checks

The [2026-10-01 baseline manifest](evidence/impeccable-ui-baseline-2026-10-01.json) records five public routes at 390, 768, 1024, 1440 and 1920 px, 900 px viewport height, full-page Chromium screenshots, UTC timestamps, the source HEAD, local ignored paths and SHA-256 identities. Every route returned HTTP 200. All 25 before/after screenshot hashes match exactly. The capture source and PNGs remain local in `.impeccable/local-baseline/` and are not committed.

Controlled hook probes used a temporary CSS file outside application imports. A gradient-text fixture produced one `gradient-text` finding with hook exit 0; a clean CSS fixture produced a clean acknowledgement with exit 0; a `.md` edit produced no false failure. `Stop` completed with exit 0. The temporary source fixtures were removed. The local audit log preserves exact event records.
