# Public accessibility checkpoint — 2026-09-24

## Zakres i cel

Cel inżynierski: WCAG 2.2 A i AA dla publicznej części Poza Nutą. Audyt objął `/`, `/karaoke-trojmiasto`, `/dla-lokali`, `/kontakt`, `/linki`, `/privacy`, `/cookies` oraz publiczny stan 404. Sprawdzono też header, footer, banner zgody, wybory analityki, kontrolę ustawień prywatności i panel. Publiczny kontakt jest odnośnikiem e-mail; w tym zakresie nie ma formularza. Admin Platform pozostaje poza audytem.

Ten zapis nie jest formalnym oświadczeniem o zgodności WCAG. Kryteria i interpretacje: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## Znalezione i naprawione problemy

| Waga | Problem | Poprawka |
| --- | --- | --- |
| P1 | Opis pierwszego linku `/linki` miał kontrast 4,17:1 (`#561f3a` na `#ff4fa3`). | Usunięto przezroczystość opisu; zachowano różowy akcent. |
| P1 | Stały banner zgody mógł zasłonić CTA z fokusem przy wąskim widoku. | Wysokość bannera ustawia odstęp treści i `scroll-padding-bottom`; test klawiatury przy 320 CSS px potwierdza odsłonięty fokus. |
| P1 | Stała kontrola prywatności nakładała się wizualnie na treść i stopkę. | Przeniesiono kontrolę do zwykłego układu stopki. Pozostaje dostępna również przed pierwszym wyborem i otwiera ten sam panel. |
| P1 | Po błędzie zapisu w panelu fokus mógł zniknąć, gdy przyciski były chwilowo wyłączone. | Fokus wraca do wybranej opcji; błąd ma `role="alert"`. |
| P2 | Header i footer były zagnieżdżone w `<main>`; brakowało linku pomijającego nawigację. | Na siedmiu trasach są osobne landmarki banner/main/contentinfo i pierwszy w kolejności link „Przejdź do treści”. |
| P2 | Wiersz Instagrama powodował poziomy scroll przy 320 CSS px i ucinał opis. | Siatka ma ograniczoną szerokość, tekst zawija się bez obcinania. |
| P2 | Po zamknięciu bannera nie było trwałego komunikatu o wyniku, a fokus zostawał na usuniętym przycisku. | Dodano `role="status"`; fokus przechodzi do linku pomijającego nawigację. |

Model zgody, API, storage i analytics pozostały bez zmian. Nie dodano overlay accessibility.

## Dowody testowe

- `npm run test:a11y`: 22 PASS, 6 celowych SKIP z powodu ograniczenia dodatkowych testów do desktop Chromium. Siedem tras ma po 0 niewyjaśnionych naruszeń axe dla tagów `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` na desktop i 360 px. Banner, dialog i 404 również mają 0 naruszeń w testowanych stanach.
- Test klawiatury: Tab przechodzi przez skip link, banner, nawigację i CTA; Space uruchamia wybór; Enter otwiera panel; Escape go zamyka i przywraca fokus. Panel ma nazwy oraz stan `aria-pressed`; błąd zapisu jest ogłaszany. Test weryfikuje, czy środek elementu z fokusem jest widoczny ponad własnym stałym UI przy 320 CSS px.
- Reflow: brak poziomego scrolla na siedmiu trasach przy 320 CSS px; test marketingowy obejmuje 360 px i desktop 1440 px. Panel mieści się przy 320 CSS px. Zrzuty po oczekiwaniu na kontrolę prywatności potwierdzają układ mobilny i desktop.
- Kontrast i stan: axe używa kolorów obliczonych przez przeglądarkę; skoncentrowany link ma obrys 3 px, a próbka ważnych celów ma co najmniej 24×24 CSS px (nawigacja, banner). Główne CTA i wiersze kanałów są większe. `prefers-reduced-motion: reduce` redukuje transition do `0.01ms` w teście computed style.
- Drzewo dostępności przeglądarki: nawigacja ma nazwę „Nawigacja główna”, link Instagrama nazwę „Otwórz Instagram”, dialog nazwę „Ustawienia prywatności”, a wybór „Tylko niezbędne” stan pressed. To kontrola drzewa, nie test NVDA.
- `npm run verify`: PASS (guards, Impeccable detector, lint, typecheck, 97 testów Vitest, 5 testów guard i production build).
- Publiczna regresja z lokalnym Supabase: `npm run test:e2e:local -- tests/e2e/public.spec.ts tests/e2e/seo.spec.ts --project=desktop-chromium --workers=2`: 25 PASS. Test czeka teraz na zamknięcie panelu przed sprawdzeniem usunięcia cookies między kartami.
- Impeccable: jeden ręczny detector pass `[]`; `npm run verify` wykonał też repo detector po ostatnich zmianach. Ocena wizualna wykryła nakładanie kontrolki P1, usunięte po przeniesieniu do stopki. Pozostałe uwagi użyteczności dotyczą długości katalogu cookies i niskiej wagi CTA kontaktu na `/linki`; nie są potwierdzonymi naruszeniami A/AA i wymagają osobnej decyzji projektowej.

`@axe-core/playwright` jest zależnością testową. Skrypt `test:a11y` jest oddzielnym gate'em `public-accessibility` w CI, opartym tylko na Chromium i bez wymogu lokalnej bazy.

## NOT VERIFIED i ryzyko resztkowe

- Rzeczywisty smoke z NVDA + przeglądarka Windows: **NOT VERIFIED**. NVDA nie jest zainstalowane w dostępnym środowisku. Browser accessibility tree nie zastępuje tej próby.
- Rzeczywiste powiększenie przeglądarki do 200%: **NOT VERIFIED**. Dostępny interfejs przeglądarki i próba skrótu w headful Chromium nie zmieniły skali. Test 320 CSS px jest silnym testem reflow, ale nie dowodem działania konkretnego mechanizmu zoom.
- Publiczny runtime `error.tsx` nie został wywołany kontrolowanym błędem; przejrzano kod i przetestowano stan 404. **NOT VERIFIED** dla ogłoszenia błędu w rzeczywistym runtime.
- Pełna ręczna matryca wszystkich kryteriów WCAG 2.2 AA ze screen readerem i różnymi ustawieniami użytkownika pozostaje otwarta. Zero naruszeń axe nie jest dowodem pełnej zgodności.

**Wniosek:** podstawy do formalnego lub technicznego claimu „WCAG 2.2 AA compliant” są niewystarczające do czasu weryfikacji realnego zoom, NVDA i domknięcia ręcznych kryteriów.
