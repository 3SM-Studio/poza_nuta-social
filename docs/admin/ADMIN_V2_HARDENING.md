# Admin Platform V2 release hardening

Date: 2026-09-22. Scope: Team & Access, Referrals, shadcn Sidebar, their dialogs and affected Admin contracts. This records the disposition of two independent read-only Impeccable assessments. Assessment A rated the existing design 24/40 (acceptable); Assessment B's detector found zero rules across 13 relevant source targets. Both reviewed desktop, 360px, 390px and 720px-equivalent renders. Their open-sheet and dialog concerns were source inferences until the later rendered check.

## MUST FIX — accepted

| Surface | Observed problem and impact | Smallest correction |
| --- | --- | --- |
| Team and Referrals tables | At 360/390px, status and management/copy controls were horizontally separated from the person or link. The Team action labels also clipped at the zoom-equivalent width. Administrators could not reliably identify the record they were acting on. | Keep the desktop tables and lay out each record as a labeled, full-width card below `md`, with its identity, status, values and controls together. |
| Sidebar | The shadcn Sidebar referenced semantic colors absent from the theme. The generated CSS lacked `bg-sidebar`; the mobile Sheet override removed its valid popover background. Active navigation was weak. | Bind Sidebar tokens to the existing dark/pink palette, retain a solid mobile Sheet, and expose the active route through `aria-current`. |

## SHOULD FIX — accepted in scope

| Surface | Problem and impact | Correction |
| --- | --- | --- |
| Team/referral mutations | High-stakes forms lacked pending and duplicate-submit feedback. | Reuse the existing form-status SubmitButton for activation, deactivation, revocation, retry and transfer. |
| Mobile controls and navigation | Small row buttons and navigation targets were below the 44px mobile target; current/expanded state was implicit. | Give mobile table actions, range links, menu rows and trigger at least 44px; expose `aria-current`, `aria-expanded` and `aria-controls`. Show the Sheet close button. |
| Operational copy and errors | Ownership/Auth/consent implementation terms slowed decisions; all referral failures misleadingly suggested permissions. | Use task-focused Polish, specific known referral errors, a named participant in destructive confirmation, and a neutral count label. |
| Clipboard and dialogs | A denied clipboard write had no recovery; short-height dialogs risked clipping the submit control. | Show a selectable address on clipboard failure and bound/scroll dialog content within the viewport. |
| Sidebar account | An inert button added a keyboard stop. | Render account identity as information. |
| Dashboard ranking table | Repeated asset labels from valid data produced duplicate React row keys in the populated local browser run. | Include the row position in the static table key. |

## OPTIONAL / deferred

- Keeping entered values inside a dialog after a server-action failure requires changing the action/response contract and form state. The existing page notice now gives specific recovery guidance; this larger state-flow change is deferred.
- The Sidebar still exposes both test-mode actions without its current expiry. Signed-cookie state and post-action refresh need a separate behavior change; the existing controls remain functional and are not a release blocker for Admin V2.

## REJECTED

- Replacing the installed shadcn Sidebar or redesigning the desktop tables: both assessments found the current visual system appropriate, and the narrow-screen layout is the specific defect.
- Treating existing focus rules, collapsed link labels, long-email wrapping, fixture names, or the Next development indicator as defects: the available evidence did not support those claims.
- A generic new navigation destination, decorative treatment, or new product behavior: outside the frozen Admin V2 scope.

## Evidence and limits

- Existing page renders: `test-results/admin-v2-before/` and `test-results/admin-v2-hardened/` (local, ignored artifacts).
- Post-hardening Sheet and short-viewport dialog renders: `test-results/admin-local-admin-sidebar--e8fc9-d-behaves-as-a-mobile-sheet-desktop-chromium/`.
- The production Supabase/SMTP/Auth redirect configuration, print scanning and remote deployment remain external release checks. A fresh local reset replayed all seven migrations and the seed; the combined 197-assertion pgTAP suite, schema lint, and both concurrency harnesses passed. The earlier six owner failures on an accumulated E2E database were fixture-state contamination.
