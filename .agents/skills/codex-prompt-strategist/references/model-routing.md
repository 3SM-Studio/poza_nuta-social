# Model routing

## Zasada

Najpierw osiągnij wymagany poziom poprawności, potem optymalizuj koszt i latency. Nie używaj droższego modelu jako substytutu złego execution contract.

Aktualność ma znaczenie. Jeśli picker Codexa albo oficjalna dokumentacja różni się od tego pliku, aktualny surface jest źródłem prawdy.

## GPT-6 baseline, 2026-09-22

### GPT-6 Luna

OpenAI opisuje Lunę jako najbardziej efektywny model do focused, high-volume tasks.

Preferuj dla:
- małych, dobrze ograniczonych zmian,
- mechanicznych refactorów,
- prostych testów zgodnych z istniejącym patternem,
- docs i cleanup,
- batch work o łatwym acceptance check.

Nie kompensuj zbyt trudnego taska coraz dłuższym promptem. Jeśli potrzeba szerokiego repo reasoning albo wielu zależnych decyzji, przejdź do Sola.

### GPT-6 Sol

OpenAI opisuje Sola jako model built for complex coding and agentic workflows.

To domyślny wybór dla poważnego software engineering:
- feature implementation,
- bugfix i normal debugging,
- multi-file changes,
- API/backend/frontend slices,
- repo remediation,
- większość review i agentic coding workflows.

Nie eskaluj do Astry tylko dlatego, że task jest ważny albo długi.

### GPT-6 Astra

OpenAI opisuje Astrę jako najbardziej zdolny model do hardest end-to-end work.

Preferuj jako eskalację dla:
- trudnego, niejednoznacznego debuggingu,
- architecture/security-sensitive judgment,
- concurrency i skomplikowanych migracji,
- recovery/incident work,
- cross-system workflows,
- tasków, gdzie koszt błędnej decyzji jest wysoki,
- przypadków, gdzie Sol po uczciwym investigation nadal nie daje stabilnego rozwiązania.

Astra ma inny profil zachowania, nie tylko większą capability:
- częściej pyta, gdy dodatkowe dane mogą zmienić wynik,
- silniej reaguje na skills, AGENTS.md i inne instruction files,
- potrafi wykonywać szerszą verification niż mały task wymaga,
- wymaga jasnego DONE, żeby uniknąć premature return albo niepotrzebnego rozszerzania pracy.

## Reasoning effort

Aktualnie:
- Astra: low, medium, high, xhigh, max; brak none.
- Sol/Luna: none, low, medium, high, xhigh, max; API default to medium.

Routing effort:
- none/low: mechaniczne i łatwo weryfikowalne taski, jeśli wspierane,
- medium: standardowy punkt startowy dla większości software work,
- high/xhigh: hard debugging, security, architecture, migration, concurrency, recovery,
- max: tylko gdy najwyższy reasoning ma materialną wartość i koszt/latency są akceptowalne.

Nie podnoś effortu automatycznie po failure. Najpierw sprawdź contract, brak kontekstu, environment i scope.

## GPT-6 Astra adapter

Przy Astrze sprawdź przed promptem:
1. Czy AGENTS.md/skills nie zawierają starego ask-first albo premature STOP?
2. Czy użytkownik faktycznie oczekuje działania end-to-end?
3. Czy DONE jest obserwowalne?
4. Czy verification budget jest proporcjonalny?
5. Czy model ma powód do clarification, który naprawdę blokuje correctness/safety?

Jeśli nie, pozwól na rozsądne założenia i pełne domknięcie autoryzowanej pracy.

## Cost/context facts

Aktualne modele GPT-6 Astra, Sol i Luna mają 1,050,000 context window i 128,000 max output tokens. To nie jest argument za preloadowaniem całego repo. Przy ponad 272K input tokens API stosuje wyższe stawki dla Astra i Sol; przede wszystkim jednak większy kontekst nadal zwiększa ryzyko instruction noise.

## Fallback

Nie zakładaj wycofania GPT-5.6 bez oficjalnego komunikatu. Jeśli GPT-6 nie jest dostępny na surface użytkownika, wybierz najlepszy faktycznie dostępny model według tej samej klasy workloadu.
