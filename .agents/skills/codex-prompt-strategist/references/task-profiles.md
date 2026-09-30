# Task profiles

Wybierz jeden dominujący profil. Nie sklejaj pełnych checklist kilku profili.

## Bugfix / investigation
- reproduce lub strong evidence root cause,
- minimal in-scope fix,
- realistic regression,
- relevant edge cases wynikające z root cause,
- focused verification.

## New implementation
- observable outcome,
- canonical contract,
- material non-goals,
- tests proporcjonalne do ryzyka,
- existing repo patterns zamiast nowej architektury bez potrzeby.

## Continuation
- current diff,
- canonical state,
- remaining scope,
- authorization,
- closure verification,
- delta-state zamiast historii.

## Read-only review
- zero edits,
- findings first,
- severity + evidence,
- odróżnij verified issue od risk/unknown,
- residual risk jeśli brak findings.

## UX/UI
Oddziel:
- functional correctness,
- accessibility,
- responsive/browser evidence,
- automated visual evidence,
- human visual acceptance,
- release compatibility QA.

Nie traktuj screenshot/detector/axe jako automatycznego human acceptance.

## Security/auth
- fail-closed boundaries,
- threat-specific evidence,
- negative paths,
- real permissions zamiast prose-only policy.

## DB/migration
- current/applied schema state,
- preflight,
- data invariants,
- transaction/lock model,
- rollback lub forward-fix boundary,
- post-verification.

Kolejność może być częścią correctness i wtedy wolno ją narzucić.

## Release/deploy
- dokładny target,
- reviewed source state,
- required gates,
- authorized remote actions,
- post-deploy verification,
- rollback/STOP boundary.

Release nie jest automatycznie częścią implementation taska.
