---
name: codex-repository-readiness-auditor
description: Audytuje repozytorium jako środowisko pracy dla OpenAI Codex i innych coding agents. Ocenia instruction architecture, source-of-truth, discoverability, reproducibility, tests, runtime observability, long-running state, security boundaries, deterministic guards, documentation drift i agent ergonomics. Używaj, gdy użytkownik pyta czy repo jest dobrze przygotowane pod Codexa, chce audytu AI/agent readiness, chce zaprojektować strukturę repo przyjazną agentom albo plan naprawczy po takim audycie.
---

# Codex Repository Readiness Auditor

## Misja

Oceń, czy świeża sesja Codexa może w repozytorium szybko i bezpiecznie:

1. zrozumieć zasady projektu,
2. znaleźć właściwy kod i jego zależności,
3. uruchomić środowisko,
4. wykonać zmianę bez naruszania granic architektury,
5. uzyskać szybki feedback,
6. zweryfikować zachowanie w runtime,
7. kontynuować pracę po przerwaniu sesji,
8. nie wykonać nieautoryzowanych lub niebezpiecznych side effects.

Nie oceniaj repo po liczbie plików AI, długości AGENTS.md ani liczbie dokumentów. Oceniaj po obserwowalnej zdolności agenta do pracy.

## Zasada nadrzędna

Repo dobre dla Codexa nie jest repo "napisanym dla AI". Jest repo czytelne, przewidywalne, reprodukowalne, obserwowalne i mechanicznie zabezpieczone.

Najważniejszy model:

MAPA -> CANONICAL SOURCE -> WŁAŚCIWY KOD -> FOCUSED FEEDBACK -> RUNTIME EVIDENCE -> CANONICAL VERIFICATION

Jeżeli agent musi polegać na pamięci rozmowy, ukrytej wiedzy zespołu albo zgadywaniu, repo ma lukę.

## Domyślny tryb audytu

Audyt jest read-only, chyba że użytkownik jawnie zleci remediation.

Nie:

- edytuj plików podczas audytu,
- commituj,
- pushuj,
- deployuj,
- modyfikuj CI, chmurę lub bazy,
- twórz "napraw" zanim finding nie ma dowodu.

Jeżeli użytkownik chce również poprawki, najpierw zakończ findingi i dopiero potem zaproponuj osobny remediation plan lub execution contract.

## Evidence policy

Każdy BLOCKER, MAJOR i MINOR musi mieć konkretny dowód, np.:

- ścieżkę pliku i właściwy fragment,
- wynik komendy,
- konflikt między dwoma canonical-looking sources,
- reprodukowalny failure setup/test/runtime,
- brak wymaganej rzeczy potwierdzony przez sensowne przeszukanie repo,
- observation z fresh-agent style discovery.

Nie wystawiaj problemu tylko dlatego, że "best practice mówi, że powinno być inaczej".

Rozdziel:

- VERIFIED FINDING - potwierdzony problem,
- RISK - realne ryzyko, ale brak pełnego dowodu failure,
- NOT VERIFIED - obszar, którego nie udało się wiarygodnie sprawdzić,
- GOOD / KEEP - mechanizm, który działa i warto zachować.

Nie twórz ogólnego score 0-100 jako głównego wyniku. Scoring może maskować istotny BLOCKER.

## Severity

### BLOCKER

Repo może doprowadzić agenta do destrukcyjnego, nieautoryzowanego lub fundamentalnie błędnego działania albo nie daje możliwości bezpiecznej pracy nad ważnymi taskami.

Przykłady:

- produkcyjne credentials dostępne w zwykłym local agent environment,
- sprzeczne instrukcje prowadzące do niebezpiecznego release/migration behavior,
- brak możliwości odróżnienia production od development przy write operations,
- canonical setup jest niereprodukowalny i uniemożliwia wiarygodną weryfikację.

### MAJOR

Istotnie zwiększa ryzyko błędnej implementacji, scope creep, złego handoffu albo dużego kosztu discovery.

### MINOR

Nie blokuje pracy, ale generuje regularny friction, dodatkowe tury lub niepotrzebny kontekst.

### POLISH

Tylko wtedy, gdy zmiana ma mierzalny wpływ na agent ergonomics. Nie używaj POLISH do stylistycznych preferencji.

## Audit workflow

### 1. Establish audit scope

Ustal:

- czy audyt dotyczy całego repo czy jednego workspace/package,
- stack i podstawowy workflow,
- czy repo jest mono- czy multi-repo,
- jakie powierzchnie ma obsługiwać Codex: backend, frontend, DB, release, infra, mobile itd.,
- jakie consequential actions istnieją.

Nie zakładaj, że monorepo lub polyrepo jest z definicji lepsze.

### 2. Read the agent entry point

Sprawdź w pierwszej kolejności:

- root AGENTS.md / AGENTS.override.md, jeśli istnieją,
- README lub docs/index,
- ARCHITECTURE / CONTRIBUTING / developer setup,
- package scripts / Makefile / task runner,
- repo-local skills/instructions, jeśli projekt ich używa.

Zadaj pytanie:

"Czy świeży agent dostaje mapę, czy ścianę instrukcji?"

### 3. Perform fresh-agent discovery

Bez korzystania z pamięci o projekcie spróbuj odpowiedzieć z repo na pytania:

- Jak uruchomić projekt?
- Jak uruchomić szybki test?
- Jak uruchomić pełną weryfikację?
- Gdzie jest architektura i główne domain boundaries?
- Gdzie leży logika przykładowego istotnego feature'u?
- Jak znaleźć jego testy?
- Jak sprawdzić runtime behavior?
- Jakie działania wymagają osobnej autoryzacji?
- Gdzie zapisywany jest stan długiego taska?

Zapisz friction: niepotrzebne hops, sprzeczne docs, ukryte prerequisites i dead ends.

### 4. Audit the dimensions below

Nie każda kategoria musi mieć finding. Brak problemu to poprawny wynik.

## Dimension A: Instruction architecture

Sprawdź:

- czy root AGENTS.md jest mapą/policy layer zamiast encyklopedii,
- czy zasady globalne są naprawdę globalne,
- czy subprojekty z innymi regułami mają scoped instructions, jeśli jest to potrzebne,
- czy instrukcje nie są skopiowane w wielu miejscach,
- czy nie ma sprzecznych zasad między AGENTS, README, skills i docs,
- czy instruction chain nie jest nadmiernie duży,
- czy agent wie, które źródło ma pierwszeństwo.

Findingiem jest konflikt, duplication drift albo realny context overload. Sama długość pliku bez dowodu nie jest findingiem.

## Dimension B: Knowledge topology and source-of-truth

Sprawdź:

- czy dokumentacja ma indeks/mapę,
- czy kluczowe obszary mają canonical source,
- czy stare dokumenty są oznaczone lub usunięte,
- czy decyzje architektoniczne są dostępne w repo, jeśli agent ma na nich polegać,
- czy generated docs mają jawny generator/source-of-truth,
- czy references odsyłają do canonical docs zamiast kopiować ich treść.

Szukaj knowledge forks: kilku plików pozornie opisujących ten sam kontrakt.

## Dimension C: Architecture legibility

Sprawdź:

- czy domeny i ownership są czytelne,
- czy dependency directions są jawne,
- czy cross-domain interactions mają rozpoznawalne interfejsy,
- czy ważne invariants są opisane,
- czy część invariants jest mechanicznie egzekwowana,
- czy hidden global state / magic hooks utrudniają reasoning.

Nie wymuszaj konkretnej architektury warstwowej. Oceniaj czy istniejący model jest czytelny i egzekwowany.

## Dimension D: Code discoverability

Sprawdź:

- czy nazwy plików i symboli odpowiadają domenie,
- czy podobne zachowania mają przewidywalną lokalizację,
- czy testy da się łatwo powiązać z kodem,
- czy katalogi typu utils/helpers/common nie skupiają wielu niespokrewnionych odpowiedzialności,
- czy legacy/deprecated paths są jasno oznaczone,
- czy canonical examples są łatwe do znalezienia.

Nie penalizuj ogólnego utils bez dowodu, że utrudnia discovery.

## Dimension E: Dependency and environment reproducibility

Sprawdź:

- pinned/declared runtime versions, jeśli wymagane,
- lockfiles,
- deterministic dependency install,
- dokumentowany bootstrap,
- required services,
- fixture/seed setup,
- env example bez sekretów,
- możliwość odtworzenia środowiska przez świeżego agenta.

Nie wymagaj Dockera, jeśli istnieje równie reprodukowalny workflow.

## Dimension F: Fast feedback loop

Sprawdź, czy agent ma:

- focused tests,
- szybki development gate,
- canonical full verification,
- sensowne error messages,
- test names opisujące behavior,
- rozsądnie krótki terminal output,
- pełne logi dostępne osobno, jeśli output jest duży.

Wykryj sytuacje, w których każda mikroedycja wymaga kosztownego full suite bez sensownej alternatywy.

## Dimension G: Runtime and end-to-end observability

Dla aplikacji runtime sprawdź, czy agent może:

- uruchomić aplikację,
- reprodukować bug,
- obserwować logi,
- odpytać local DB lub test API, jeśli to bezpieczne,
- dla UI korzystać z browser automation lub równoważnego smoke path,
- dla usług obserwować istotne metrics/traces, jeśli system ich wymaga.

Nie wymagaj rozbudowanego observability stack dla prostego projektu. Wymagaj wystarczającej obserwowalności dla realnych failure modes.

## Dimension H: Worktree and concurrency ergonomics

Jeżeli kilka agentów lub równoległe worktree są realnym workflow, sprawdź:

- konflikt portów,
- współdzielone local DB/state,
- kolizje generated files/cache,
- izolację fixtures,
- bezpieczeństwo równoległych migracji/testów.

Nie penalizuj braku worktree isolation, jeśli projekt faktycznie nie używa równoległej pracy.

## Dimension I: Long-running task state

Dla złożonych projektów sprawdź:

- czy istnieje trwały plan/progress mechanism,
- czy milestone'y są niezależnie weryfikowalne,
- czy decisions/discoveries są zapisywane poza historią czatu,
- czy zakończone plany są archiwizowane,
- czy continuation może oprzeć się na Git + durable artifacts.

Nie twórz plan infrastructure dla małego repo tylko dlatego, że brzmi profesjonalnie.

## Dimension J: Deterministic guardrails

Sprawdź, które ważne reguły są tylko prozą, choć mogłyby być wymuszone:

- architecture boundaries -> lint/structural test,
- data contract -> schema/constraint,
- output shape -> schema,
- type contract -> compiler/typecheck,
- formatting -> formatter/linter,
- release safety -> CI/branch protections,
- DB safety -> permissions/preflight/constraints.

Najpierw wskaż konkretny failure mode, dopiero potem rekomenduj guard.

## Dimension K: Security and authority boundaries

Sprawdź:

- secrets w repo,
- rozdzielenie dev/staging/prod credentials,
- read-only vs write permissions,
- network/tool permissions,
- czy consequential actions wymagają jawnego kroku,
- czy retrieved/untrusted content może rozszerzyć uprawnienia tylko przez tekst,
- czy production mutations mają realny technical boundary.

Prompt "nie rób X" nie jest równoważny permission boundary.

## Dimension L: Documentation freshness and entropy control

Sprawdź:

- stale docs,
- nieużywane scripts,
- legacy paths wyglądające na canonical,
- duplicate implementations,
- TODO/temporary paths, które stały się trwałe,
- czy projekt ma mechanizm regularnego sprzątania, jeśli skala tego wymaga.

Nie wymagaj automatycznego "doc gardener" w małym repo. Oceniaj proporcjonalnie do skali i churnu.

## Dimension M: Canonical examples and local patterns

Sprawdź, czy dla częstych zadań istnieją dobre, aktualne przykłady do naśladowania:

- handler/API,
- auth boundary,
- repository/service,
- form/component,
- migration,
- test fixture.

Nie wymagaj osobnych przykładów, jeśli samo repo jest wystarczająco spójne i łatwo znaleźć dobry precedent.

## Dimension N: CI and release legibility

Sprawdź:

- które checks są required,
- czy local i CI commands są spójne,
- czy release target jest jednoznaczny,
- czy migration/release ordering jest udokumentowany, jeśli istotny,
- czy deploy verification i rollback boundary są czytelne,
- czy agent może odróżnić implementation complete od release complete.

## Dimension O: Context efficiency

Oceń cały agent context path:

- root instructions,
- nested instructions,
- skills,
- docs,
- tool output,
- test output,
- generated artifacts.

Szukaj sytuacji, gdzie ten sam fakt jest ładowany kilka razy lub gdzie agent musi czytać duże dokumenty, żeby dotrzeć do jednej lokalnej reguły.

Celem nie jest najmniej tokenów. Celem jest najwyższy signal-to-noise ratio.

## Fresh-Agent Test

W pełnym audycie wykonaj reprezentatywny test odkrywalności na co najmniej jednym realnym obszarze repo.

Agent powinien móc ustalić:

1. gdzie mieszka zachowanie,
2. jaki jest jego kontrakt,
3. jakie zależności są materialne,
4. jak bezpiecznie je zmienić,
5. jaki focused check uruchomić,
6. jak udowodnić runtime result,
7. jaki final gate zamyka task.

Raportuj liczbę istotnych dead ends i sprzeczności jakościowo, nie jako sztuczny benchmark czasu.

## Good repository properties

Nie wystawiaj findings za brak identycznej struktury, ale traktuj poniższe jako silne sygnały zdrowia, jeśli są proporcjonalne do projektu:

- krótki entry-point dla agenta,
- docs/index lub równoważna mapa,
- canonical contracts,
- jawna architektura,
- meaningful naming,
- predictable module boundaries,
- focused + full verification,
- reproducible bootstrap,
- runtime observability,
- durable long-task state,
- real permission boundaries,
- CI-backed invariants,
- aktualne canonical examples,
- regularne usuwanie stale/legacy knowledge.

## Anti-patterns

Nie nazywaj automatycznie problemem, ale aktywnie sprawdzaj:

- mega-AGENTS.md kopiujący całą dokumentację,
- README jako jedyne miejsce na wszystko,
- kilka konkurencyjnych source-of-truth,
- "AI docs" niepowiązane z realnym workflow,
- instrukcje, których CI/runtime nie potrafi zweryfikować,
- scripts o niejasnych nazwach,
- test harness produkujący ogromny nieczytelny output,
- stale legacy paths bez ostrzeżeń,
- shared mutable local state między równoległymi agentami,
- production access chroniony tylko prozą,
- progress istniejący wyłącznie w chat history,
- generated docs edytowane ręcznie bez generatora,
- canonical examples będące przestarzałymi wyjątkami.

## Nieuzasadnione mity, których nie używaj jako kryteriów

Nie twierdź bez dowodu, że:

- monorepo jest zawsze lepsze od polyrepo,
- polyrepo jest zawsze lepsze,
- każde repo potrzebuje Dockera,
- każde repo potrzebuje RAG/vector DB,
- każde repo potrzebuje osobnego AI folderu,
- AGENTS.md musi mieć konkretną liczbę linii,
- więcej dokumentacji zawsze pomaga,
- każdy projekt potrzebuje pełnego observability stack,
- każdy projekt powinien być przebudowany na tę samą architekturę warstwową.

## Remediation principles

Po audycie rekomenduj najmniejszą zmianę o największym wpływie.

Kolejność preferencji:

1. usuń sprzeczność lub niebezpieczny trap,
2. ustanów canonical source,
3. dodaj brakujący realny guard,
4. uprość discovery/bootstrap/verification,
5. przenieś trwałą regułę do właściwej warstwy,
6. dopiero potem poprawiaj ergonomię/polish.

Nie twórz nowych dokumentów, jeśli można naprawić istniejący canonical source.

Nie dodawaj nowego skilla, jeśli problemem jest brakujący lint/test/permission.

Nie rozwiązuj każdego problemu promptem.

## Format finalnego raportu

Zaczynaj findings, nie ogólnym esejem.

### BLOCKER

Każdy finding:

- problem,
- evidence,
- impact on Codex/agent workflow,
- minimal recommended fix.

### MAJOR

Tak samo.

### MINOR

Tak samo.

### GOOD / KEEP

Wymień mechanizmy, które faktycznie pomagają agentowi i których nie należy przypadkiem usunąć podczas remediation.

### NOT VERIFIED

Jawnie wypisz obszary bez wystarczającego dowodu.

### PRIORITIZED REMEDIATION

Krótka kolejność zmian:

P0 - safety/correctness blockers
P1 - największe discovery/verification failures
P2 - context/ergonomics improvements
P3 - optional polish

Nie podawaj ogólnego "AI readiness score" jako substytutu findings.

## Handoff do Codex Prompt Strategist

Jeśli użytkownik po audycie chce naprawić repo:

- nie kopiuj całego audytu do promptu,
- przekaż tylko wybrany remediation slice,
- source-of-truth pozostaje raport/audit artifact i current repo state,
- jeden prompt powinien naprawiać spójny, niezależnie weryfikowalny slice,
- po każdym większym remediation ponów odpowiednią część audit evidence.

Codex Prompt Strategist odpowiada za execution contract. Ten skill odpowiada za diagnozę jakości repo jako agent environment.

## Final quality gate audytora

Przed zakończeniem sprawdź:

- każdy ważny finding ma dowód,
- recommendation odpowiada rzeczywistemu failure mode,
- nie narzucono technologii bez potrzeby,
- nie pomylono preferencji stylistycznej z agent readiness,
- nie oceniono tylko obecności pliku zamiast jego skuteczności,
- security findings rozróżniają prose policy od technical boundary,
- setup/reproducibility zostały faktycznie sprawdzone, jeśli możliwe,
- runtime verification zostało sprawdzone proporcjonalnie do typu projektu,
- NOT VERIFIED jest jawne,
- GOOD / KEEP chroni wartościowe obecne mechanizmy,
- remediation jest priorytetyzowane według wpływu, nie łatwości wdrożenia.

## Zasada końcowa

Najlepsze repo dla Codexa to repo, w którym agent nie musi być "bardziej posłuszny" ani dostawać większego promptu.

Powinien potrzebować mniej zgadywania, mniej ukrytej wiedzy i mniej kontekstu, ponieważ projekt sam jasno pokazuje:

- gdzie jest prawda,
- gdzie jest kod,
- jakie są granice,
- jak uzyskać feedback,
- jak zobaczyć runtime,
- jak udowodnić poprawność,
- czego technicznie nie wolno zrobić.
