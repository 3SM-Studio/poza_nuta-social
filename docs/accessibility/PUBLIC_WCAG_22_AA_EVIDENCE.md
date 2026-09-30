# Public Marketing — WCAG 2.2 A/AA evidence

Stan lokalnej oceny: 2026-09-28. Zakres: `/`, `/karaoke`, `/dla-lokali`, `/kontakt`, `/linki` oraz wspólny nagłówek, stopka, panel zgody i ustawienia prywatności. Strony `/prywatnosc` i `/cookies` objęto automatycznym smoke testem; `/karaoke-trojmiasto` jest przekierowaniem 308, nie osobną treścią. Podstawą kryteriów jest [WCAG 2.2 W3C](https://www.w3.org/TR/WCAG22/). Wynik dotyczy lokalnego renderu, nie jest deklaracją zgodności ani certyfikatem.

**Bilans 55 kryteriów A/AA: PASS 31 · FAIL 0 · NOT APPLICABLE 21 · NEEDS HUMAN CONFIRMATION 3.** `PASS` oznacza, że dostępny dowód potwierdza bieżącą implementację w badanym zakresie. `NOT APPLICABLE` opisuje brak danej funkcji lub treści. `NEEDS HUMAN CONFIRMATION` nie jest zaliczeniem; wymaga wskazanej poniżej oceny przed formalną deklaracją. Nie wykonano testu rzeczywistym czytnikiem ekranu NVDA/VoiceOver; użyto drzewa dostępności Playwright. Osoba korzystająca z technologii asystującej powinna potwierdzić główne ścieżki na docelowym hostingu.

## Powtarzalne dowody

- `npm run test:e2e:local` uruchomił zestaw a11y wraz z pełnym E2E: w czterech projektach przeglądarkowych 26 przypadków a11y przeszło, 38 zostało celowo pominiętych według przypisania do projektów. Dla dwóch projektów objętych `test:a11y` (desktop Chromium i mobile-360 Chromium) było to 24 PASS i 8 SKIP. Pełny E2E: 255 PASS, 133 SKIP, 0 FAIL. Kontrole reflow, odstępów tekstu, przesłonięcia CTA, focus i drzewa dostępności przeszły. Axe z tagami `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`: zero naruszeń na siedmiu trasach przy 360 i 1440 CSS px. Axe jest narzędziem częściowym.
- Interakcja: klawiatura przechodzi przez skip link, menu, wybór zgody, dialog prywatności i powrót fokusu. Playwright sprawdza widoczny focus oraz brak jego przykrycia przez stałe kontrolki w reprezentatywnym przebiegu przy 320 CSS px. Drzewo dostępności potwierdza `banner`, `main`, `contentinfo`, nawigację z nazwą, cel Instagrama i `aria-pressed` w dialogu.
- Reflow: Chrome/Playwright przy 320, 390, 640, 768, 1024, 1440 i 1920 CSS px na pięciu trasach: `scrollWidth === clientWidth`, bez kontrolek stopki poza viewportem i bez nakładających się linków. Przy 320 CSS px wstrzyknięto `letter-spacing: .12em`, `word-spacing: .16em`, `line-height: 1.5` i odstęp akapitu `2em`; wynik na pięciu trasach także 320/320 i bez utraty kontrolek. 640 i 320 CSS px są odpowiednikami układu przy 200% i 400% z bazowej szerokości 1280 CSS px; nie sterowano natywnym zoomem przeglądarki.
- Semantyka obrazów została sprawdzona w source: fotografie wydarzenia mają opisowe `alt`, znaki pomocnicze `aria-hidden`, prawdziwe logo jest plikiem SVG. Statyczny kadr wizerunkowy pozostaje osobną bramką praw publikacji.
- Kolor tekstu i głównych kontrolek: axe `color-contrast` nie zgłosił naruszeń w testowanych renderach; napisy na fotografii karaoke dostały nieprzezroczyste ciemne podłoże. Kompletny audyt pikselowy wszystkich stanów ikon i obrysów pozostaje pozycją otwartą w 1.4.11.
- Media: aktualnie renderowane trasy nie odtwarzają filmu ani dźwięku i nie zawierają formularza podania danych osobowych, logowania, płatności, rezerwacji lub gestów przeciągania. Plik MP4 w repozytorium nie jest renderowany na tych trasach.

## Macierz kryteriów

Skróty: `P` = PASS, `N` = NOT APPLICABLE, `H` = NEEDS HUMAN CONFIRMATION. Oceniono wszystkie kryteria poziomów A i AA; `4.1.1 Parsing` jest usunięte w WCAG 2.2 i nie należy do 55.

| Kryterium | Poziom | Stan | Dowód / granica |
|---|---|---|---|
| 1.1.1 Non-text Content | A | P | Opisowe `alt` fotografii, ozdobniki ukryte; axe. |
| 1.2.1 Audio-only and Video-only (Prerecorded) | A | N | Brak publikowanego odtwarzacza. |
| 1.2.2 Captions (Prerecorded) | A | N | Brak publikowanego odtwarzacza. |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | A | N | Brak publikowanego odtwarzacza. |
| 1.2.4 Captions (Live) | AA | N | Brak transmisji. |
| 1.2.5 Audio Description (Prerecorded) | AA | N | Brak publikowanego odtwarzacza. |
| 1.3.1 Info and Relationships | A | P | Landmarks, jeden H1, sekcje, listy i etykiety w DOM/drzewie. |
| 1.3.2 Meaningful Sequence | A | P | Kolejność DOM i czytania pięciu tras sprawdzona z renderem. |
| 1.3.3 Sensory Characteristics | A | P | Instrukcje zgłoszenia i nawigacji są słowne, bez poleceń zależnych od koloru/położenia. |
| 1.3.4 Orientation | AA | P | Układ działa w wąskich i szerokich viewportach; brak blokady orientacji. |
| 1.3.5 Identify Input Purpose | AA | N | Brak formularza danych użytkownika. |
| 1.4.1 Use of Color | A | P | Linki mają tekst i podkreślenie/obrys, wybór zgody ma `aria-pressed`. |
| 1.4.2 Audio Control | A | N | Brak automatycznego dźwięku. |
| 1.4.3 Contrast (Minimum) | AA | P | Axe na 360/1440; jasne/ciemne powierzchnie i podpis na ciemnym podłożu. |
| 1.4.4 Resize Text | AA | P | Brak utraty treści w układach 640/320 CSS px. |
| 1.4.5 Images of Text | AA | P | Treść jako tekst HTML; prawdziwy znak marki stanowi dopuszczalne logo. |
| 1.4.10 Reflow | AA | P | Pięć tras bez poziomego przewijania przy 320 CSS px. |
| 1.4.11 Non-text Contrast | AA | H | Główne CTA/obrysy sprawdzone; wymagane pełne wzrokowe próbkowanie wszystkich ikon i stanów focus. |
| 1.4.12 Text Spacing | AA | P | Test 320 CSS px z wymaganymi odstępami; stopka bez clippingu i nakładania. |
| 1.4.13 Content on Hover or Focus | AA | N | Brak wyskakującej treści zależnej od hover/focus. |
| 2.1.1 Keyboard | A | P | Skip link, menu, zgoda, dialog, linki i CTA obsługiwane klawiaturą. |
| 2.1.2 No Keyboard Trap | A | P | Dialog zamyka Escape i oddaje focus; nawigacja nie zatrzymuje Tab. |
| 2.1.4 Character Key Shortcuts | A | N | Brak pojedynczych skrótów znakowych. |
| 2.2.1 Timing Adjustable | A | N | Brak limitu czasu na decyzję; timeout API nie kończy wyboru użytkownika. |
| 2.2.2 Pause, Stop, Hide | A | N | Brak automatycznie poruszającej się treści. |
| 2.3.1 Three Flashes or Below Threshold | A | P | Brak błyskających treści; animacje to krótkie przejścia kolorów. |
| 2.4.1 Bypass Blocks | A | P | Widoczny po fokusie skip link prowadzi do `main`. |
| 2.4.2 Page Titled | A | P | Każda trasa ma indywidualny tytuł. |
| 2.4.3 Focus Order | A | P | DOM, menu i dialog mają logiczną kolejność; reprezentatywna sekwencja Tab. |
| 2.4.4 Link Purpose (In Context) | A | P | Linki nazwane przez cel, zewnętrzny Instagram oznaczony nową kartą. |
| 2.4.5 Multiple Ways | AA | P | Główna nawigacja i stopka dają alternatywne dojście do tras. |
| 2.4.6 Headings and Labels | AA | P | Jeden H1 na trasę, sekcje z nazwami, przyciski opisowe. |
| 2.4.7 Focus Visible | AA | P | Obrys `:focus-visible`, test klawiatury przy 320 CSS px. |
| 2.4.11 Focus Not Obscured (Minimum) | AA | H | Reprezentatywne 20 elementów przeszło test; pełna sekwencja wszystkich tras i stanów wymaga kontroli człowieka. |
| 2.5.1 Pointer Gestures | A | N | Brak gestów wielopunktowych i ścieżkowych. |
| 2.5.2 Pointer Cancellation | A | P | Akcje są zwykłymi linkami/przyciskami aktywowanymi po puszczeniu. |
| 2.5.3 Label in Name | A | P | Widoczne nazwy linków/przycisków są w nazwie dostępnej; axe. |
| 2.5.4 Motion Actuation | A | N | Brak sterowania ruchem urządzenia. |
| 2.5.7 Dragging Movements | AA | N | Brak przeciągania. |
| 2.5.8 Target Size (Minimum) | AA | H | Krytyczne kontrolki mają ≥24 px; potrzebna pełna ocena pozostałych małych celów i wyjątków inline/odstępu. |
| 3.1.1 Language of Page | A | P | `<html lang="pl">` na każdej trasie. |
| 3.1.2 Language of Parts | AA | N | Pozostałe nazwy obce to własne marki/miejsca. |
| 3.2.1 On Focus | A | P | Focus nie uruchamia samoczynnej nawigacji. |
| 3.2.2 On Input | A | P | Wybór zgody jest jawnie uruchamianą akcją przycisku. |
| 3.2.3 Consistent Navigation | AA | P | Ta sama nawigacja na pięciu trasach. |
| 3.2.4 Consistent Identification | AA | P | Te same cele mają zgodne nazwy i zachowanie. |
| 3.2.6 Consistent Help | A | P | Ustawienia prywatności i kontakt w stałej lokalizacji stopki. |
| 3.3.1 Error Identification | A | N | Brak publicznego formularza z walidacją danych. |
| 3.3.2 Labels or Instructions | A | N | Brak publicznego formularza danych. |
| 3.3.3 Error Suggestion | AA | N | Brak publicznego formularza z błędami walidacji. |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | N | Brak transakcji i zapisu danych formularza. |
| 3.3.7 Redundant Entry | A | N | Brak procesu wymagającego ponownego wpisania danych. |
| 3.3.8 Accessible Authentication (Minimum) | AA | N | Brak publicznego uwierzytelniania. |
| 4.1.2 Name, Role, Value | A | P | Axe i drzewo dostępności: nav, linki, przyciski, dialog, `aria-pressed`. |
| 4.1.3 Status Messages | AA | P | Status wyboru prywatności ma `role="status"`. |

## Wymagana kontrola człowieka

1. Przejść całą ścieżkę klawiaturą przy 320/390 i desktop, zwłaszcza gdy świeży panel zgody lub menu są otwarte; potwierdzić, że każdy fokus jest widoczny i nieprzykryty.
2. Skontrolować kontrast ikon, cienkich obrysów i focus ringów na wszystkich powierzchniach w stanach normalnym, hover i focus; nie opierać się wyłącznie na axe.
3. Zmierzyć wszystkie małe cele i zastosowanie wyjątków 2.5.8 w renderze mobilnym, łącznie z linkami w treści. Przeprowadzić smoke test NVDA/VoiceOver na rzeczywistym urządzeniu lub obsługiwanym środowisku przed formalną deklaracją.
