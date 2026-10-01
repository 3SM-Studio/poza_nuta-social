# Optional current-work note

Git branch, HEAD, status and diff are always authoritative. Create `docs/current/WORK.md` only when a long, unfinished slice needs a small remaining-delta note that Git alone cannot convey. Remove it before closing and merging that slice. Its absence is the normal completed state.

When present, use these headings with concrete, non-placeholder content:

```md
# Current work
## Outcome
## Working branch
## Baseline and current state
## Remaining work
## Completed verification
## NOT VERIFIED / blockers
## Authority boundary
```

Name the exact branch and relevant SHAs, then verify them against Git on continuation. Keep the note short. Do not put durable product rules, full task history, logs, stale test counts, secrets or personal data here. Canonical contracts remain in the documents linked from [`docs/INDEX.md`](../INDEX.md).
