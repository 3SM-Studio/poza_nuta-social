# Public Marketing — lokalna ocena gotowości wydania

Stan: 2026-09-28. Zakres: obecne publiczne trasy `/`, `/karaoke`, `/dla-lokali`, `/kontakt`, `/linki`, strony prawne i wspólne elementy. Jest to lokalna ocena implementacji przed ewentualnym preview, bez wdrożenia i bez certyfikacji dostępności. Kanoniczne decyzje produktu pozostają w `PRODUCT.md`, `DESIGN.md` i `docs/PRODUCT_DECISIONS.md`; kontrakt analityki w `docs/analytics/TRACKING_PLAN.md`. Kryterialne dowody WCAG są w `docs/accessibility/PUBLIC_WCAG_22_AA_EVIDENCE.md`.

## Granice wydania

- Trasa uczestnika to `/karaoke`; `/karaoke-trojmiasto` jest wyłącznie przekierowaniem 308. Nie ma katalogu wydarzeń ani stron realizacji. Przyszłe wydarzenia wymagają autorytatywnego kontraktu z osobnej platformy karaoke.
- Obecna oferta komunikowana jako wieczory karaoke w Trójmieście. Szersza tożsamość kulturowa nie oznacza obecnie odrębnej sprzedaży ogólnych usług eventowych.
- Materiały z iGrania są lokalnym materiałem preview. `docs/PUBLIC_MARKETING_V2_MEDIA.md` nie potwierdza praw do publikacji wizerunków, lokalu i materiału. **To jest bramka produkcyjna**; sam plik w repozytorium nie jest dowodem zgody.
- To repozytorium jest niezależną aplikacją. Nie importuje bazy, auth ani runtime innej aplikacji Poza Nutą.

## Źródła norm i zakres prawny

- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) jest podstawą technicznej macierzy A i AA.
- [ETSI](https://www.etsi.org/technical-groups/hf/?id=1570) opublikowało EN 301 549 V4.1.1 (2026-09). Publikacja normy nie oznacza automatycznie, że ta wersja została wymieniona jako zharmonizowana w Dzienniku Urzędowym UE. [Komisja Europejska](https://digital-strategy.ec.europa.eu/en/policies/web-accessibility-directive-standards-and-harmonisation) i [wykaz gov.pl dla e-handlu](https://www.gov.pl/web/dostepnosc-cyfrowa/wykaz-norm-zharmonizowanych-i-specyfikacji-technicznych-dla-wymagan-dostepnosci-uslugi-handlu-elektronicznego) nadal wskazują V3.2.1 w swoich kontekstach. Status prawny należy potwierdzić na dzień wdrożenia.
- [EAA, dyrektywa 2019/882](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019L0882) oraz [objaśnienie PAD dla usług e-handlu](https://www.gov.pl/web/dostepnosc-cyfrowa/polski-akt-o-dostepnosci--uslugi-handlu-elektronicznego) wiążą zakres e-handlu z usługą przez internet na indywidualne żądanie konsumenta w celu zawarcia umowy. Dziś strona jest informacyjna: nie ma zakupu biletu, płatności, rezerwacji ani konsumenckiego zawarcia umowy online. Kwalifikacja prawna pozostaje **LEGAL-SCOPE-UNCERTAIN**, zwłaszcza że status podmiotu i szczegóły oferty nie są tu potwierdzone. Zakup biletu, rezerwacja lub inna transakcja konsumencka wymagałyby ponownej analizy. Ta ocena nie jest opinią prawną ani certyfikatem.

## Impeccable i jakość wizualna

Method: dual-agent (A: `/root/impeccable_a` · B: `/root/impeccable_b`). A najpierw samodzielnie oceniła source i render jako design director; B niezależnie uruchomiła `impeccable detect --json src/app/(public)` i sprawdziła przeglądarkę. Synteza nastąpiła po obu ocenach. Detektor: `[]`, 0 ustaleń. To nie jest dowód poziomu art direction.

- **Zgodne ustalenia:** pięć tras utrzymuje jedną hierarchię i kierunek Digital Music Editorial; brak poziomego overflow na sprawdzonych szerokościach, prawdziwe obrazy i nawigacja zachowują sens. A potwierdziła konkretność opowieści o udziale bez śpiewania i zapis iGrania; B potwierdziła semantykę H1, działające menu i rozmiary głównych CTA.
- **Tylko A / poprawione:** przy 320×768 stały panel zgody przysłaniał CTA lokalu i fragment maila. Teraz poniżej 361 CSS px znajduje się w przepływie dokumentu, bez dodatkowego pustego `padding-bottom`. Opis zgłoszenia jest spójny w sześciu krokach na `/` i `/karaoke`; link do realizacji ma 44 px wysokości, a CTA lokalu jest w całości w pierwszym widoku 1440×768.
- **Tylko B:** brak dodatkowych deterministycznych defektów. **Fałszywe alarmy detektora:** brak. W obserwacji przeglądarki niezaładowana fotografia poza viewportem była zwykłym lazy loading; po przewinięciu obraz się ładuje. Test pod `127.0.0.1` nie był poprawnym dowodem interakcji dev origin, więc nawigację sprawdzono na `localhost`.
- **Pozostałe P2:** przy świeżej zgodzie, 1024/1440×768, panel zasłania wizualnie prawą część linku realizacji `/dla-lokali` i prawe pole linku e-mail na `/kontakt`. Primary CTA współpracy i tekst e-mail pozostają dostępne. Po nadaniu focus obu linkom przeglądarka przewija je w całości nad panelem (`elementFromPoint` trafia w link); nie jest to potwierdzona przeszkoda klawiatury. Dalsze przenoszenie banera na desktopie osłabiłoby pierwszy widok głównego CTA, więc P2 pozostaje jawne. Wąski hub `/linki` ma wspólną długą stopkę; skrócenie jej byłoby zmianą systemu bez wykazanej przeszkody zadaniowej.
- **Ograniczenie narzędzia:** CUA nie pozwoliło na mutowalny injection; nie uruchomiono nakładki Impeccable ani `live-server`. Inspekcję renderu wykonano w odrębnych kontekstach Playwright/Codex Browser. Końcowa runda A+B objęła pięć tras przy 768, 1024 i 1920 CSS px oraz kluczowe stany 320, 390 i 1440 CSS px; nie stwierdzono P0/P1 ani regresji fotografii, typografii, header/footer.

## SEO, GEO i udostępnianie

| Trasa | Odpowiedź wyszukiwarkowa i H1 | Indeksowanie |
|---|---|---|
| `/` | Poza Nutą, obecne wieczory karaoke w Trójmieście; H1 „Zanim ktoś chwyci mikrofon.” | index, self canonical |
| `/karaoke` | Dobrowolny udział, instrukcja zgłoszenia i droga do aktualnych dat; H1 „Karaoke w Trójmieście.” | index, self canonical |
| `/dla-lokali` | Współpraca i rzeczywista realizacja iGranie w Lochu; H1 „Twój lokal. Wspólny wieczór.” | index, self canonical |
| `/kontakt` | Adres e-mail i rozdzielenie pytań o terminy od współpracy; H1 „Napisz do nas.” | index, self canonical |
| `/linki` | Oficjalny kanał i kontakt dla wejść QR/bio; H1 „Oficjalne kanały.” | `noindex, follow`, self canonical, poza sitemap |

Każda z pięciu tras zwróciła 200, miała odrębny title/description, canonical, OG title/description/URL/image, Twitter `summary_large_image`, jeden H1 oraz wewnętrzne linki. Strony prawne także są w sitemap. `/karaoke-trojmiasto` zwraca jedno 308 do `/karaoke`, bez łańcucha i bez wpisu w sitemap. `/linki` pozostaje crawlable, ponieważ robot musi odczytać `noindex, follow`; decyzję zapisano w `docs/PRODUCT_DECISIONS.md`. Canonical produkcyjny wymaga prawdziwego `NEXT_PUBLIC_SITE_URL`; pomiar lokalny używa fallback `http://localhost:3000` i nie dowodzi konfiguracji hostingu.

JSON-LD: `Organization`, `WebSite` i `WebPage` na `/`, `BreadcrumbList` i `WebPage` na pozostałych. Organizacja zawiera faktyczną nazwę, domenę, oryginalny plik logo, zatwierdzony e-mail, Trójmiasto i wyłącznie aktywne oficjalne profile. Nie ma `LocalBusiness`, fikcyjnego adresu, `Event`, sztucznych FAQ ani `llms.txt`. Maszyna może rozpoznać obecny format karaoke, miejsce działania, dobrowolność występu, drogę dla lokalu i oficjalne kanały. `robots.txt` zezwala `OAI-SearchBot` na publiczne strony, blokuje `GPTBot` zgodnie z obecną konfiguracją; nie oznacza to gwarancji widoczności w odpowiedziach AI.

Karta OG 1200×630 PNG została wyrenderowana i obejrzana: czytelny komunikat, prawdziwe SVG logo, bez fotografii osób. Ten wariant nie dodaje ryzyka praw do zdjęć w samym share image. Na Vercel preview globalny `X-Robots-Tag: noindex, nofollow, noarchive` i pusta sitemap zapobiegają promowaniu URL preview; finalne działanie należy sprawdzić na hostingu.

## Dostępność i EN 301 549

Macierz i procedura: [`docs/accessibility/PUBLIC_WCAG_22_AA_EVIDENCE.md`](accessibility/PUBLIC_WCAG_22_AA_EVIDENCE.md). Dla 55 kryteriów WCAG 2.2 A/AA: **PASS 31, FAIL 0, NOT APPLICABLE 21, NEEDS HUMAN CONFIRMATION 3**. Axe nie wykryło błędów na siedmiu trasach przy 360/1440 CSS px. Pięć tras nie ma overflow przy 320 CSS px z wymuszonymi odstępami tekstu ani przy 390, 640, 768, 1024, 1440 i 1920 CSS px. 640/320 są równoważnymi viewportami reflow dla 200%/400% z 1280, nie natywnym testem zoom. Keyboard, skip link, dialog zgody, focus, landmarks i drzewo dostępności mają lokalne dowody. Rzeczywisty czytnik ekranu **nie był testowany**. Trzy punkty wymagają kontroli człowieka: pełny kontrast nietekstowy, wszystkie stany przesłonięcia focus oraz wszystkie małe cele/wyjątki target size.

| Obszar EN 301 549 | Status | Granica dowodu |
|---|---|---|
| Wymagania treści web, clause 9 | PASS dla zbadanej implementacji / GAP dla formalnego potwierdzenia | Macierz WCAG i testy, ale 3 kryteria z kontrolą człowieka oraz brak NVDA/VoiceOver. |
| Udokumentowanie funkcji dostępności i dostępny kontakt/wsparcie, clause 12 w zakresie adekwatnym | GAP | Strony kontaktu i prywatności są dostępne, lecz procedury wsparcia i formalna informacja o kompatybilności nie są zatwierdzone. |
| Sprzęt, telefonia i aplikacja natywna | NOT APPLICABLE | Obecny produkt w tej repozytorium jest stroną WWW. |
| Zastosowanie prawne EN/PAD do tego podmiotu i usługi | LEGAL SCOPE UNCERTAIN | Wymaga kwalifikacji prawnej i aktualnego wykazu norm zharmonizowanych; techniczny audit nie rozstrzyga obowiązku. |

Sama publikacja EN 301 549 V4.1.1 nie oznacza automatycznej harmonizacji prawnej tej wersji. Dzisiejsza strona nie prowadzi konsumenckiego zakupu, rezerwacji ani płatności. Bilety, booking, płatność lub e-commerce zmieniłyby analizę PAD/EAA. Nie wydajemy deklaracji prawnej ani certyfikatu dostępności.

## Prywatność i zgoda — stan kontraktu

Przed potwierdzoną zgodą mogą powstać jedynie niezależne zdarzenia cookieless bez identyfikatora odwiedzającego, sesji i późniejszego zszywania. `pn_consent` zapisuje podpisaną preferencję serwera; tymczasowe `pn_consent_preference` służy wyłącznie bezpiecznej synchronizacji odmowy lub oczekującej akceptacji. Po potwierdzeniu zgody analitycznej nowe zdarzenia mogą użyć krótkiej sesji, a pseudonimowy identyfikator przeglądarki wymaga tej zgody. Zdarzenia V3 `cta_click` i `section_view` są tylko consented. Zgoda marketingowa nie uruchamia obecnie GA4 ani piksela. Wycofanie zgody natychmiast blokuje dalsze zdarzenia z tożsamością; wcześniejsze cookieless nie są do niej dopinane.

Szczegółowy opis i ograniczenia: `docs/analytics/PRIVACY_AND_CONSENT.md`. **Bramki produkcyjne:** potwierdzenie administratora danych, odbiorców i transferów, retencji oraz procesu usuwania danych; tabela dowodów zgody ma marker wygaśnięcia, ale brak automatycznego zadania purge. Nie wolno przedstawiać lokalnej zgodności implementacji jako opinii prawnej.

| Stan | Cookies i pamięć publiczna | Pomiar |
|---|---|---|
| Przed wyborem | Brak `pn_session`, `pn_visitor`, `pn_acquisition`; `pn_consent_signal` jest tylko chwilowym sygnałem między kartami. | Możliwe ograniczone zdarzenia cookieless bez wspólnego identyfikatora. |
| Po odmowie | Podpisane `pn_consent` lub lokalne `pn_consent_preference=2.deny` przy niedostępnym serwerze; brak cookies analitycznych. | Tylko ograniczony pomiar cookieless. |
| Po akceptacji oczekującej na serwer | `pn_consent_preference=2.pending-accept.<UUID>` identyfikuje próbę zapisu zgody, nie osobę; brak analitycznego ID. | Nadal cookieless, aż do trwałego zapisu dowodu zgody. |
| Po potwierdzonej zgodzie analitycznej | `pn_consent` 180 dni, `pn_session` 30 minut, `pn_visitor` 180 dni, `pn_acquisition` tylko gdy kwalifikuje się źródło; `pn_hub_outbound_v1` w `sessionStorage` tylko po wyjściu do kanału. | Nowe zdarzenia sesyjne i powroty przeglądarki, bez dopinania wcześniejszych zdarzeń. |
| Zgoda marketingowa | Publiczne API dopuszcza tylko `marketing:false`; nie ma przełącznika aktywującego piksele. | Brak GA/GTM/Meta/TikTok/Hotjar w każdym stanie. |
| Wycofanie | Blokada identyfikacji natychmiast; wygaszenie cookies analitycznych przy zdrowej odpowiedzi, lokalna odmowa chroni także przy awarii. | Kolejne zdarzenia cookieless; wcześniejsze dane wymagają zatwierdzonej procedury retencji i obsługi żądań. |

Pełny wykaz jest renderowany z `src/lib/storage-inventory.ts` na `/cookies`. Admin auth, `sidebar_state`, flagi test/internal są odrębnymi mechanizmami panelu. Nie są cookies publicznej analityki. Surowe IP, fingerprint i dokładny model urządzenia nie trafiają do tabel analitycznych; logi infrastruktury wymagają osobnej informacji o dostawcy i okresie przechowywania. Publiczna polityka ma dziś jawne placeholdery administratora, odbiorców/transferów i retencji; bez zatwierdzonych wartości **PRODUCTION READY pozostaje NO**.

## Status aktywacji i ograniczenia pomiaru

Pierwszoosobowa architektura analytics V3 pozostaje autorytatywna. `contact_click` oznacza zamiar kontaktu, nie pozyskany lead; `outbound_click` oznacza wybór kanału, nie dotarcie do serwisu zewnętrznego; `/r/[code]` oznacza użycie linku, nie dowód fizycznego skanu. `section_view` jest ekspozycją według progu widoczności, nie dowodem przeczytania. Raport biznesowy musi oddzielać produkcyjny ruch zewnętrzny od preview, internal, test i bot oraz jawnie odróżniać populacje cookieless od consented.

Istniejący dashboard zachowuje trend, sesje/odwiedzających, porównanie okresów, rankingi pozyskania, zachowanie outbound i kontakt. Nowa sekcja w `/admin` odczytuje istniejące uporządkowane lejki V3 dla uczestnika i lokalu, oddzielne dotarcie do `/karaoke` i `/dla-lokali` oraz ekspozycje wybranych treści. Kanały liczy jako rozłączne sesje ze zgodą według kanonicznego `session_acquisition.channelGroup`. Jednostki dystrybucji i uczestników poleceń liczy jako przyjęte zdarzenia `tracking_entry` `/r`, także cookieless; nie dzieli ich przez liczbę sesji. `distribution_unit` pokazuje nazwę wraz ze stabilnym kodem linku. Każdy raport biznesowy filtruje production/external. Nowy odczyt jest dostępny tylko dla `service_role`, bez nowych tabel i bez nowych zdarzeń.

Przy zerowej bazie dashboard pokazuje pusty stan, przy mniej niż 20 wejściach do lejka nie pokazuje procentu ukończenia, a niedostępnego odczytu nie przedstawia jako zera. Nowe zapytanie obejmuje maksymalnie 366 dni; bieżący wybór zakresów i strefa `Europe/Warsaw` pozostają. AI referral jest tylko rozpoznaną kategorią źródła, gdy istnieje stosowny referrer lub kontrolowany sygnał; zero nie oznacza braku obecności marki w odpowiedziach AI. Definicje metryk są w `docs/analytics/METRICS_DEFINITIONS.md` i `docs/analytics/TRACKING_PLAN.md`.

### Pytania, na które odpowiada obecny `/admin`

- **Overview:** ile było sesji i przeglądarek za zgodą, ile nowych/powracających, trend w czasie oraz porównanie z poprzednim okresem. Procenty overview mają jawne liczniki i mianowniki; przy bazie <20 pokazuje kreskę i liczby. Średnia kliknięć na sesję z wyjściem także znika przy małej bazie.
- **Acquisition:** które źródła, kanały grupowe i kampanie pozyskały sesje; jedna sesja ma jedną kategorię pozyskania. AI referral pokazuje tylko rozpoznane wejścia.
- **Offline:** które materiały, umiejscowienia i tracking linki pozyskały sesje za zgodą; które `distribution_unit` i kody linków przyniosły przyjęte wejścia `/r`, także bez zgody. To nie są ekspozycje plakatów ani pewne skany QR.
- **Referrals:** wejścia `/r` przypisane uczestnikowi polecenia, gdy istnieje powiązanie. To nie jest liczba unikatowych osób ani skutecznie pozyskanych uczestników wydarzenia.
- **Uczestnik:** uporządkowane kroki CTA z głównej → `/karaoke` → CTA aktualnych informacji → `/linki`; osobno zasięg samej trasy i ekspozycje wyjaśnienia udziału.
- **Lokal/B2B:** CTA z głównej → `/dla-lokali` → CTA kontaktu → `/kontakt` → `contact_click`; osobno zasięg trasy i ekspozycje realizacji. Kliknięcie `mailto` to intencja, nie lead ani umowa.
- **Zachowanie:** sesje z outbound, wieloma destynacjami, powrót do huba i ranking docelowych kanałów. Kliknięcie outbound nie potwierdza wizyty w serwisie zewnętrznym.

Puste okresy, brak kampanii/QR/AI/referrals i brak obu ścieżek mają opisowe stany bez NaN, Infinity, `undefined` lub 0/0. Awaria RPC ma stan niedostępności zamiast zera. Raport nie mierzy przeczytania sekcji, fizycznego skanu, liczby uczestników wydarzenia, wysłanej wiadomości e-mail, podpisanej współpracy ani tego, czy AI wymieniło markę bez wejścia na stronę.

## Zewnętrzne żądania w przeglądarce

W świeżym kontekście Playwright Chromium na siedmiu publicznych trasach wszystkie zaobserwowane żądania miały host `localhost`; fonty `next/font/google` były podawane z własnych ścieżek `/_next/static/media/*.woff2` (6 URL). Nie zaobserwowano żądań do GA, GTM, Meta, TikTok, Hotjar, zewnętrznych fontów, skryptów ani osadzonych widgetów. Link do oficjalnego kanału prowadzi przez własne `/go/[slug]` i dopiero potem poza stronę. Test E2E z lokalnym Supabase potwierdził także, że po zapisanej zgodzie analitycznej żądania w przeglądarce pozostają first-party w Chromium i WebKit. Samo kliknięcie przy niedostępnym backendzie pozostawia `pending-accept`, a nie aktywną sesję analityczną.

## Bezpieczeństwo i preview

Obecna konfiguracja dodaje `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` blokujące kamerę/mikrofon/geolokalizację, `X-Frame-Options: DENY`, HSTS oraz ograniczone CSP z `base-uri 'self'`, `frame-ancestors 'none'`, `object-src 'none'`. `poweredByHeader` jest wyłączony. Sekrety Supabase i service role pozostają po stronie serwera, a nowe RPC dashboardu jest niedostępne dla `anon` i `authenticated`. Lokalny `npm audit --audit-level=moderate` wykazał 0 podatności. To przegląd konfiguracji aplikacji; nagłówki i logi trzeba sprawdzić ponownie na docelowym HTTPS hostingu.

Na `next start` lokalna odpowiedź `/` miała wymienione nagłówki, bez `X-Powered-By`; w `.next/static` nie było publicznych plików `.map`. CSP blokuje osadzanie, obiekty i zmianę base URI, lecz nie ma jeszcze ścisłej polityki `script-src`/nonce. Rozszerzenie jej wymaga osobnego testu skryptów Next i analityki, więc nie ukrywamy tej granicy jako pełnej ochrony XSS. Standardowe `x-nextjs-*` ujawniają mechanikę cache, bez sekretów. Lokalny advisor Supabase po przypięciu `search_path` do funkcji raportowej zwrócił `No issues found` przy `--type security --level warn`. Prawdziwe HSTS, reverse proxy/CDN, source maps hostingu i logowanie żądań wymagają kontroli na HTTPS preview/produkcji.

Preview Vercel otrzymuje globalny `X-Robots-Tag: noindex, nofollow, noarchive`, `robots.txt` umożliwia crawlerowi odczyt tej dyrektywy, a sitemap preview jest pusta. Metadane strony też deklarują `noindex`. Docelowy hostname i przekierowanie z alternatywnych hostów pozostają do konfiguracji podczas osobnej pracy wdrożeniowej.

## Wydajność — lokalna gotowość

Aktualny publiczny hero jest obrazem rzeczywistego wydarzenia; źródłowy WebP ma około 30 kB. Pozostałe użyte kadry mają około 38–54 kB każdy. Zachowany plik MP4 nie jest pobierany przez obecne strony. Fonty są samo-hostowane w buildzie Next. Lokalne pomiary lab nie są produkcyjnym RUM: po wdrożeniu trzeba potwierdzić LCP, CLS, INP i zachowanie sieci na rzeczywistych urządzeniach, nie obiecywać Core Web Vitals na podstawie localhost.

Na lokalnym `next build` + `next start` Playwright Chromium sprawdził pięć tras przy 390×844 i 1440×900. Na `/` kandydatem LCP był poprawnie załadowany hero WebP (`next/image`), około 396 ms na mobile i 120 ms na desktop w tym lokalnym przebiegu; na `/karaoke` hero WebP, na `/dla-lokali`, `/kontakt`, `/linki` tekst H1 lub akapit. Zaobserwowany CLS = 0 w dziesięciu przebiegach, bez błędów `pageerror`. Na publicznych trasach przeglądarka pobrała około 199–201 kB skryptów, około 26–29 kB CSS i sześć samo-hostowanych plików fontu łącznie około 104 kB transferu w tym środowisku; nie wykryto podwójnych URL fotografii. Powtarzające się `/api/track` na kontakcie reprezentują osobne zdarzenia, nie podwójny download medium. Nie ma autoplay wideo ani zewnętrznego widgetu. Ten lab nie mierzy rzeczywistego INP ani terenowych Core Web Vitals; admin to osobny bundle i nie obciąża publicznego wejścia w obserwowanym renderze.

## PREVIEW BACKEND SAFETY — preflight 2026-09-28

**Decyzja: PREVIEW BLOCKED (klasa D: shared Production backend with broader write risk).** Nie utworzono nowego deploymentu, nie zmieniono zmiennych Vercel ani domen. Stan lokalny użyty do analizy: `538f8ee6b430c8aaaf6aff27f7314bbef14c6463`.

Projekt Vercel `poza-nuta-social` (`prj_PnRDe7BvVPwIg2mjvEjmwsePVGKQ`) należy do zespołu `atypicalmichas` (`team_Iz39dSAukKL6IynXUBsx5F93`). Preset to Next.js, katalog główny repozytorium, Node 24.x; Preview śledzi gałęzie nieprzypisane do innego środowiska. Istniejący produkcyjny alias obejmuje `socials.pozanuta.pl`, który nie jest automatycznie uznany za docelową domenę marketingową. Preview nie ma przypiętej własnej domeny. Deployment Protection: `Vercel Authentication`, `Require Log In` włączone, `Standard Protection`; niezalogowana osoba spoza zespołu nie powinna uzyskać treści Preview. Wyjątków domenowych ani sekretu bypass dla automatyzacji nie skonfigurowano w widocznym panelu.

W panelu projektu wszystkie 15 obecnych zmiennych ma **jedną wspólną wartość dla Production i Preview**: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANALYTICS_SIGNING_SECRET`, `BOOTSTRAP_OWNER_EMAIL`, `CONTACT_EMAIL`, `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_TIKTOK_URL`, `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_YOUTUBE_URL`, `NEXT_PUBLIC_MAIN_SITE_URL`. Nie było zmiennych wyłącznie Preview, wyłącznie Production ani podłączonych zmiennych zespołowych. Pierwsza grupa `NEXT_PUBLIC_*` jest konfiguracją publiczną, choć Vercel oznacza te wpisy jako Secret; dwa klucze `SUPABASE_*` bez prefiksu oraz sekret podpisywania są serwerowe. Samo istnienie `NEXT_PUBLIC_GA4_MEASUREMENT_ID` nie aktywuje wysyłki do GA4 w obecnym kodzie. Brak zatwierdzonych zmiennych prawnych/prywatności nadal stanowi osobną bramkę produkcyjną. Wartości sekretów nie zostały odczytane ani zapisane w raporcie.

Wspólny rekord `NEXT_PUBLIC_SUPABASE_URL` oznacza ten sam projekt Supabase dla aktualnych wdrożeń Production i przyszłego Preview; nie ma dowodu na odrębny backend staging. `createAdminClient()` używa `SUPABASE_SECRET_KEY`, z fallbackiem do `SUPABASE_SERVICE_ROLE_KEY`, oraz `server-only`. Przeglądarka nie inicjuje osobnego klienta Supabase. Klient SSR i proxy używają publicznego klucza wyłącznie dla Auth na trasach Admin/Auth. Samo usunięcie jednego z dwóch kluczy serwerowych z Preview nie wyłączy zapisów.

| Powierzchnia | Odczyt wspólnej bazy | Zapis wspólnej bazy | Dostęp / uprawnienie | Ograniczenie |
|---|---|---|---|---|
| Publiczne strony i `/linki` | Aktywne `destinations` przez klienta service-role | Brak przy renderze serwerowym | Publiczne Preview po przejściu ochrony Vercel | Render może dodatkowo uruchomić `/api/track` w przeglądarce. |
| `/api/track`: świeży, odmowa, `page_view`, `contact_view`, `contact_click` | Odczyt podpisanej zgody z cookies | `analytics_ingest_cookieless_v1` → `analytics_cookieless_events`; błędne/odfiltrowane żądania mogą też zapisać `analytics_quality_exceptions` | Publiczne API; service-role na serwerze | **Zapis zachodzi również przed zgodą i po odmowie.** Nie ma ID odwiedzającego/sesji w zdarzeniu cookieless. |
| `/api/consent` | GET: cookies; POST: opcjonalny odczyt dowodu | Akceptacja: `analytics_consent_evidence` upsert; wycofanie po wcześniejszej zgodzie: append-only insert | Publiczne API; service-role | Dowód zgody nie ma kolumny `environment`; marker wygaśnięcia 180 dni nie jest automatycznym purge. Publiczna zgoda marketingowa jest zawsze `false`. |
| `/api/track` po zgodzie; CTA i sekcje | Kontekst cookies/atrybucji | `analytics_ingest_event_v1` → `analytics_visitors`, `analytics_sessions_v2`, `analytics_events_v2`, `analytics_quality_daily`; wyjątkowo quality exceptions | Publiczne API; service-role | Event/sesja/jakość otrzymują `preview` przy `VERCEL_ENV=preview`; `pn_session` trwa 30 min, `pn_visitor` do 180 dni. |
| `/r/[code]` | Aktywny tracking link, kampania i wymiary | `tracking_entry` w cookieless lub consented | Publiczny redirect; service-role | Nie używać produkcyjnych kodów QR jako fixture Preview. |
| `/go/[slug]` | Aktywna destynacja | `outbound_click` w cookieless lub consented | Publiczny redirect; service-role | Kliknięcie oficjalnego kanału jest mutacją analityczną, także bez zgody. |
| Admin/Auth | Użytkownik Supabase Auth, profile, zaproszenia, konfiguracja, raporty | Magic link/OTP, bootstrap właściciela lub przyjęcie zaproszenia przy uwierzytelnieniu; akcje Admin mutują team, kampanie, destynacje, tracking links i referrals | Auth plus role Admin; Auth używa publicznego klucza, akcje service-role | Preview współdzieliłby projekt Auth i encje Production. Nie testować mutacji Admin. |
| Raporty Admin | RPC raportowe z service-role | Brak w samym odczycie | Auth/Admin | Business KPI filtrują `production` + `external`; diagnostyka może obejmować Preview. |

Ścieżka klasyfikacji: Vercel ustawia systemowe `VERCEL_ENV=preview` dla deploymentu Preview; `analyticsEnvironment()` nadaje priorytet tej wartości przed `ANALYTICS_ENV`, hostem i `NODE_ENV`. `/api/track`, `/r`, `/go` i ingest cookieless przekazują ją jako `p_environment`; RPC zapisują pole `environment`. Lokalne E2E `tests/e2e/cookieless-analytics-local.spec.ts` oraz `tests/e2e/admin-local.spec.ts` potwierdziły zapis `preview` w lokalnej bazie. SQL `analytics_reporting_eligible_v1('business', ...)` dopuszcza wyłącznie `production` i `external`, co sprawdzają testy `analytics_reporting_scope_test.sql` i testy dashboardu. **To chroni biznesowe KPI według aktualnego kontraktu kodu i migracji, ale nie usuwa mutacji produkcyjnej bazy.** Dodatkowo `analytics_consent_evidence` i `analytics_quality_exceptions` nie są izolowane przez kolumnę `environment`. Rzeczywistego stanu migracji na zdalnym Supabase nie weryfikowano zapisem.

Obecny kod ma zachowanie bez kluczy Supabase: `createAdminClient()` i klient SSR zwracają `null`, publiczne destynacje używają fallbacku z konfiguracji, ingest jest best-effort, a publiczne strony działają. Akceptacja analityki bez zapisu dowodu zgody zwraca 503 i pozostaje w stanie oczekującym; sprawdzenie serwerowego ingestion trzeba wtedy odroczyć. Vercel oferuje wybór zakresów `Production`/`Preview` przy edycji zmiennej, ale obecne rekordy są wspólne i zapisane jako write-only Secret. Nie zmieniono ich zakresu bez pewności, że wartości Production pozostaną nienaruszone. Najmniejsza bezpieczna ścieżka do niemutującego Preview to odłączenie od Preview **wszystkich pięciu** zmiennych Supabase (`NEXT_PUBLIC_SUPABASE_URL`, obu publicznych kluczy i obu kluczy serwerowych), zachowując Production; następnie potwierdzenie zakresu i builda bez backendu przed deploymentem. Taki Preview pozwoli sprawdzić HTTPS, SEO, render, dostępność i sieć, lecz odroczy real-host analytics ingestion i Admin. Alternatywą jest osobny, zweryfikowany backend staging. Do czasu izolacji: **bez deploymentu, bez testowego ruchu, bez produkcyjnych fixture.**

## SHARED SUPABASE PREVIEW HARDENING — decyzja właściciela 2026-09-28

Właściciel zatwierdził wspólny istniejący backend Supabase dla Production i Preview, bez nowego projektu, gałęzi bazy ani płatnej infrastruktury. Ten zapis **zastępuje propozycję odłączenia Preview od Supabase** z preflightu powyżej. Kod lokalny rozdziela dozwoloną telemetrię według środowiska, a mutacje biznesowe Admina blokuje w Preview. Nie oznacza to jeszcze zweryfikowanego wdrożenia: migracja musi trafić do dokładnie tego projektu, którego używa Vercel.

`VERCEL_ENV` jest pierwszym źródłem kanonicznego serwerowego środowiska; parametr, nagłówek ani treść żądania nie mogą nadać `production`. Cookie zgody, odwiedzającego, sesji i atrybucji zawierają środowisko. Preview nie akceptuje historycznych tokenów bez tego oznaczenia ani tokenów z innego środowiska. Cookies pozostają host-only. Stare rekordy `analytics_consent_evidence` i `analytics_quality_exceptions` zachowują `NULL` jako nieustaloną proweniencję; migracja nie przypisuje im fikcyjnie Production. Nowe zapisy aplikacji używają środowiska z serwera.

| Powierzchnia | Zachowanie Preview po migracji |
|---|---|
| Zdarzenia consented, cookieless, `/r`, `/go`, CTA, sekcje, kontakt | Dozwolony zapis telemetrii z `environment = preview`; tracking failure nadal nie blokuje przekierowania. `/r` pozostaje na hoście Preview. |
| Dowód akceptacji/wycofania zgody | Dozwolony, oznaczony `preview`; brak retrospektywnego łączenia wcześniejszych zdarzeń cookieless. |
| Wyjątki jakości | Dozwolone, oznaczone `preview`; Data Quality ma filtr środowiska, `unknown` pokazuje starsze nieoznaczone wyjątki. |
| Odczyt konfiguracji i raportów Admin | Dozwolony po istniejącym Auth i członkostwie; panel pokazuje komunikat tylko do odczytu. |
| Kampanie, destynacje, linki, polecenia, członkowie, role, zaproszenia, transfer właściciela | Centralny guard odrzuca mutacje po stronie serwera. |
| Bootstrap właściciela i przyjęcie zaproszenia przy logowaniu | Pomijane w Preview; Supabase Auth może nadal utrzymywać własne metadane sesji. |

Migracja `20260928195325_shared_preview_environment_isolation.sql` dodaje nullable `environment` do dowodów zgody i wyjątków jakości, indeks raportowy `(project_key, environment, occurred_at desc)`, `analytics_data_quality_v2` z jawnym filtrem oraz poprawia Business licznik wyjątków w `analytics_realtime_v2`. Biznesowe RPC nadal wymagają populacji `production` i `external`; diagnostyka może objąć wszystkie środowiska. Lokalny test SQL porównuje niezmienione wyniki siedmiu raportów biznesowych przed i po dopisaniu Preview/Development. Indeks służy konkretnemu filtrowi projektu, środowiska i czasu w raporcie jakości.

### REMOTE SOCIAL BACKEND BOOTSTRAP — 2026-09-29

Właściciel niezależnie potwierdził, że `vrusesdkxpednckqyuwn` (`poza-nuta-socials`, `eu-central-1`) jest właściwym istniejącym projektem Supabase dla tej aplikacji. Przed bootstrapem read-only query wykazało 0 tabel/widoków/funkcji `public`, 0 użytkowników Auth, 0 bucketów Storage i brak tabeli historii migracji. Sam panel Vercel nie ujawnia wartości `NEXT_PUBLIC_SUPABASE_URL`, gdyż rekord ma typ Secret; potwierdzenie identyfikatora pochodzi od właściciela.

Sprawdzono wszystkie 24 migracje w kolejności repozytorium: `001`–`003` tworzą podstawowy schemat; `20260919171044`–`20260928195325` rozwijają analitykę, Admin, prywatność i izolację Preview. Klasyfikacja: **24 SAFE SCHEMA BOOTSTRAP**, w tym warunkowe backfille starych tabel, które przy pustym schemacie nie mają wierszy źródłowych; **0 niejawnych seedów** i **0 migracji wymagających odrzucenia dla tego pustego projektu**. Usunięcia dotyczą starych wersji funkcji, triggerów i ograniczeń zastępowanych w tym samym uporządkowanym łańcuchu. Dry run Supabase CLI wypisał dokładnie te 24 pliki i `seeds: []`, `roles: []`. Następnie zastosowano tę potwierdzoną listę przez `db push --project-ref vrusesdkxpednckqyuwn --skip-vault --yes`, bez resetu, synchronizacji diff ani modyfikacji innych projektów. Historia zdalna ma 24 wersje, od `001` do `20260928195325`, o tym samym odcisku co lokalna.

Porównanie po migracjach: lokalnie i zdalnie **18 tabel, 0 widoków, 43 funkcje, 225 kolumn, 131 ograniczeń, 67 indeksów, 18 tabel w zestawieniu RLS, 0 polityk publicznych**. Odciski nazw oraz definicji kolumn, ograniczeń, indeksów, funkcji i polityk są identyczne. Zdalny `db advisors --type security --level warn --fail-on error`: `No issues found`. Wszystkie 18 tabel aplikacji miało 0 wierszy. Następnie osobno zastosowano wyłącznie istniejący kanoniczny `supabase/seed.sql`: jeden prawdziwy aktywny kanał `instagram` (`https://www.instagram.com/poza.nuta/`), który jest także domyślnym oficjalnym URL w kodzie. Bez niego po uruchomieniu autorytatywnej pustej tabeli `/linki` straciłoby kanał. Nie wstawiono kampanii, zdarzeń, odwiedzających, członków Admin ani użytkowników Auth.

Baseline bezpośrednio przed ruchem Preview: `destinations = 1`; `campaigns = 0`, `admin_profiles = 0`, `auth.users = 0`, `analytics_consent_evidence = 0`, `analytics_cookieless_events = 0`, `analytics_events_v2 = 0`, `analytics_sessions_v2 = 0`, `analytics_quality_exceptions = 0`. Zdalny schemat jest przygotowany; wynik lokalny sam w sobie nadal nie zastępuje testu izolacji na chronionym hoście Preview.

## Bramki zewnętrzne

- Potwierdzić prawa do każdego wybranego kadru i rozpoznawalnych osób, zakres użycia materiału oraz uprawnienia lokalu; przechowywać dowody poza repozytorium.
- Zatwierdzić treść polityki prywatności, dane administratora, hosting/odbiorców, retencję, mechanizm purge i procedurę żądań osób, których dane dotyczą.
- Przed publikacją potwierdzić rzeczywisty host, HTTPS, redirecty hostów, wartości środowiskowe, autoryzowane kanały i kontakt, a po wdrożeniu sprawdzić rzeczywiste logi oraz Core Web Vitals z RUM.

## Decyzja wydaniowa

- **TECHNICALLY READY: YES** dla lokalnej implementacji i sprawdzonych przepływów. Kryteria dostępności oznaczone `NEEDS HUMAN CONFIRMATION` pozostają otwartymi granicami dowodu, więc nie jest to deklaracja formalnej zgodności WCAG/EN.
- **PREVIEW READY: do potwierdzenia na prawdziwym hoście**. Właściciel zatwierdził wspólny backend, a potwierdzony projekt Social ma pełny schemat repozytorium. Lokalny kod oznacza dozwoloną telemetrię Preview i blokuje mutacje biznesowe. Kontrolowany chroniony deployment i read-only porównanie KPI przed/po są następną bramką. Wymóg oddzielnego backendu z wcześniejszego preflightu został zastąpiony decyzją właściciela.
- **PRODUCTION READY: NO**. Brak potwierdzonych praw publikacji rozpoznawalnych osób i lokalu w kadrach iGrania oraz zatwierdzonych danych administratora, odbiorców/transferów, retencji, purge i procedur prywatności. Przed formalną deklaracją dostępności trzeba także domknąć trzy ręczne punkty macierzy, test czytnika ekranu i kwalifikację prawną EN/PAD. Weryfikacja prawdziwego hosta i produkcyjnego RUM również nie została wykonana.

Kontrole lokalne: `npm run verify` (guardy, Impeccable detector, ESLint, TypeScript, 278 testów Vitest i 5 testów guard, optimized Next build), `npm audit --audit-level=moderate` (0 podatności), lokalny reset Supabase i `npm run test:db` (22 pliki, 594 asercje), Supabase security advisor (`No issues found`). Pełny `npm run test:e2e:local` na czystej lokalnej bazie: **255 PASS, 133 SKIP, 0 FAIL** w Chromium i WebKit, łącznie z Admin i trasami publicznymi. W zestawie a11y przez cztery projekty: 26 PASS i 38 zamierzonych SKIP; w dwóch profilach komendy `test:a11y`: 24 PASS i 8 SKIP. Test `Data Quality` używa stałej przyszłej daty i zapisuje syntetyczne rekordy do celowo append-only dziennika; powtórzenie pełnego E2E na tej samej bazie wymaga ponownego lokalnego resetu. To ograniczenie fixture testowego, nie wynik publicznej strony.
