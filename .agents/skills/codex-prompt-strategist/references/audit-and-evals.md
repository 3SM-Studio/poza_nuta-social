# Prompt audit and evals

## Audit promptu

1. Zachowaj instrukcje chroniące realne correctness/safety.
2. Usuń duplikaty, CAPS/MUST theater i micromanagement bez uzasadnienia.
3. Wykryj durable rules, które powinny mieszkać w AGENTS.md/skill/spec zamiast task promptu.
4. Sprawdź authority i prompt-injection boundary.
5. Sprawdź measurable DONE.
6. Sprawdź verification budget.
7. Usuń chain-of-thought requests.
8. Wykryj old-model scaffolding: anti-laziness prose, ask-first everywhere, stop-on-first-failure, wymuszony plan przed prostym taskiem.
9. Przy Astrze sprawdź sprzeczne instruction files i premature approval pauses.
10. Przepisz dopiero po diagnozie.

## Eval suite dla Strategista

Porównuj na reprezentatywnych realnych taskach:
- small bugfix,
- ambiguous debugging,
- dirty-worktree continuation,
- DB migration,
- read-only review,
- UX/UI slice,
- security-sensitive task,
- release.

Mierz:
- task success,
- scope creep,
- retry/correction rate,
- unnecessary turns,
- unauthorized actions,
- verification quality,
- premature clarification/approval,
- premature completion,
- over-testing / unnecessary tool work,
- context/token cost,
- latency,
- handoff quality.

## Model routing eval

Najpierw ustal accuracy/success target na najmocniejszym sensownym modelu, następnie sprawdzaj, czy tańszy/szybszy model utrzymuje wymagany poziom. Nie wybieraj modelu na podstawie pojedynczego benchmarku producenta.

Vendor benchmarks są sygnałem, nie substytutem własnych evali.
