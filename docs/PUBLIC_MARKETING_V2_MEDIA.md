# Public Marketing V2 — kanoniczny rejestr dowodów praw do mediów

Stan audytu: 2026-09-29, baseline HEAD `061926620356414e4cfd512a28b2b8907e170346`. Zakres: `/`, `/karaoke`, `/dla-lokali`, `/kontakt`, `/linki`, publiczne strony prawne, wspólny header/footer, OG/Twitter, favicon i `Organization.logo`. `/karaoke-trojmiasto` przekierowuje do `/karaoke`. To **ocena dostępnych dowodów**, nie opinia prawna ani zgoda na wdrożenie. Materiały wydarzenia są dziś wyłącznie do chronionego Preview. Prywatne dowody i dane osób należy trzymać poza repo; tu zapisywać tylko zredagowany status, zakres i referencję do kontrolowanej ewidencji.

## Status i granice inwentarza

`GREEN` — dowód wspiera zamierzoną publikację na stronie; `YELLOW` — częściowy dowód wymaga potwierdzenia zakresu; `RED` — brak wymaganego dowodu; `N/A` — kategoria nie dotyczy; `UNKNOWN` — nie można ustalić pochodzenia lub uprawnionego podmiotu. Ogólny status jest `RED`, gdy brakuje choć jednego wymaganego dowodu; nie oznacza to twierdzenia, że publikacja jest zakazana.

**6 logicznych źródeł:** cztery klipy iGrania (`C0020`, `C0015`, `C0016`, `C0014`), dostarczony znak Poza Nutą i prosty favicon zapisany w kodzie. **5 aktualnych pochodnych publicznych:** cztery WebP z klipów i generowany PNG OG ze znaku. Dwa SVG są plikami źródłowymi, więc łącznie jest siedem publicznych wizualnych assetów/odpowiedzi. `next/image` wytwarza na żądanie warianty szerokości/kodeku czterech WebP; ich liczba zależy od viewportu/cache i nie tworzy nowych źródeł ani osobnych spraw praw. Te same WebP są używane przy normal motion i `prefers-reduced-motion: reduce`; nie ma osobnych mobilnych masterów.

**NOT CURRENTLY IN RELEASE SURFACE:** `experience-group-loop.mp4` i `experience-group-poster.webp`, pochodne `C0020`. Są w katalogu `public`, więc ich URL jest technicznie dostępny, ale obecny kod tras nie importuje `DocumentaryLoop`, jedynego komponentu z referencją do nich. Nie są dodatkowymi blockerami aktualnego renderu; hero nadal dziedziczy bramkę źródła `C0020`. Ponowne użycie pętli/postera wymaga kontroli każdej klatki i zakresu licencji. Lokalny eksport MP4 ma 720 × 1280, 5,5 s, bez ścieżki audio. `experience-duet.webp` z `C0017.MP4` znajduje się tylko w wejściowym ZIP, poza repo i stroną.

**MEDIA RIGHTS EVIDENCE COMPLETE: NO.** Cztery używane kadry wydarzenia nie mają w zbadanych źródłach dowodu publikacji osób i lokalu ani ustalonego uprawnienia operatora. Pochodzenie/prawo użycia dostarczonego znaku też nie jest w pełni udokumentowane. Obecna strona mogłaby przejść bramkę po zebraniu i zatwierdzeniu konkretnych uprawnień (**wariant A**); jeśli ich nie da się uzyskać, potrzebna będzie osobna decyzja o zastąpieniu/usunięciu kadrów (**B**). Nie ma podstaw do **C**.

## Ustalenia źródłowe

| Źródło | Potwierdzony fakt | Granica dowodu |
| --- | --- | --- |
| [`PRODUCT_DECISIONS.md`](PRODUCT_DECISIONS.md), decyzja właściciela 2026-09-25 | Nazwa iGranie w Lochu i faktyczny opis współpracy są dopuszczone w wąskim case study; autentyczna fotografia jest kierunkiem produktu. | Nie jest zgodą autora, uczestników ani lokalu na obrazy, wnętrze, logo i wideo. |
| [`PUBLIC_MARKETING_V2_CONTENT_PRODUCTION.md`](PUBLIC_MARKETING_V2_CONTENT_PRODUCTION.md), §6; [`PUBLIC_MARKETING_MEDIA_PRODUCTION_BRIEF.md`](PUBLIC_MARKETING_MEDIA_PRODUCTION_BRIEF.md), §7 | Wymagają prywatnego manifestu `original → select → crop/export`, osobnej decyzji jakości i publikacji. | To briefy, bez wpisów `approved`. |
| `pozanuta_v2_media_pack.zip` → `MEDIA_MANIFEST.md` (26.09.2026) | Wskazuje `C0020`, `C0015`, `C0016`, `C0014`. SHA-256 potwierdza bajtową identyczność repo i ZIP dla pętli, postera oraz trzech używanych WebP innych niż hero. | Nie wskazuje twórcy, licencji ani timecode klatek `C0014–16`; ich przypisanie do konkretnych oryginałów opiera się na manifeście, bez technicznego porównania pełnych źródeł. |
| [Drive: surowe media wydarzenia 16.08.2026](https://drive.google.com/drive/folders/1aSj_5o2AXPgl3JwKXbfjY542WF6KgjyY), odczyt 29.09.2026 | Pliki `C0014.MP4`, `C0015.MP4`, `C0016.MP4`, `C0020.MP4` są dostępne w folderze projektu. | Obecność nie dowodzi autorstwa ani praw publikacji. |
| `experience-group-chorus.webp` + lokalna pętla `experience-group-loop.mp4` + brief media | Hero wizualnie odpowiada klatce ok. 0,75 s `C0020`; porównano z lokalnym eksportem wideo. | Nie jest eksportem z RAW `3SM08904.ARW` i nie ma pełnego zapisu parametrów konwersji ani decyzji praw. |
| `pozanuta_raw_hero_selection.zip` → `SELECTION.md` (27.09.2026) | RAW `3SM08904/08903/08910/08917.ARW` to alternatywni kandydaci jakościowi. | Żaden nie jest aktualnym hero ani fallbackiem prawnym. |
| [Notatka operacyjna iGranie w Lochu](https://docs.google.com/document/d/1NzRNea6mSjKXaIoXmp27c8-c1BURQsTgKI1CVx79QU4/edit?usp=drivesdk), aktualizacja 11.08.2026 | Potwierdza współpracę i sprzęt lokalu, opisuje ustne ustalenia operacyjne. | Nie obejmuje zgody na konkretne kadry, wnętrze, oznaczenia czy osoby. Foldery eventu `01_Brief`, `05_Eksport_finalny`, `07_Raport_i_rozliczenie` były puste w dostępnym odczycie. |
| Przeszukanie repo i dostępnego Drive po `zgoda`, `wizerunek`, `fotograf`, `C0020` (29.09.2026) | Nie znaleziono odpowiadającego tym kadrom rejestru zgód/licencji. | Wynik nie dowodzi, że prywatne dowody nie istnieją poza przeszukanymi źródłami. |
| Końcowy proporcjonalny pass 29.09.2026: metadane Drive dokładnie `C0014/15/16/20.MP4`, ich folder surowych mediów, manifest ZIP oraz pojedyncze wyszukiwanie Rovo po czterech nazwach plików i autorze/operatorze | Metadane Drive potwierdzają nazwy, typy, rozmiary i daty modyfikacji z 16.08.2026; Rovo zwróciło ogólne strony operacyjne, bez wskazania autora tych czterech plików albo zgody publikacyjnej. | Ani właściciel/uploadujący Drive, ani nazwa RAW `3SM…`, ani osoba na zdjęciu nie dowodzą autorstwa. Brak nawet wiarygodnej identyfikacji „likely source”; **twórca: `UNKNOWN`, osoba do odnalezienia: `TO BE IDENTIFIED`**. |

Żaden znaleziony rekord nie wskazuje osoby nadającej prawa do klipów, daty nadania, zakresu **website / social / marketing / paid**, czasu, warunków cofnięcia ani dozwolonych cropów. Website korzysta z fotografii tylko na własnych stronach; OG jest brand-only. Nie przenosić domniemanej zgody na social ani płatną promocję.

## Rejestr: cztery źródła iGrania

Klasyfikacja wizualna bez ustalania tożsamości: **B** — wyraźnie rozpoznawalne osoby (`IDENTIFIABLE PEOPLE: YES`); **D** — osoby widoczne, szczegół identyfikacji niepewny (`UNCLEAR`); **E** — brak osób (`NO`). Każdy kadr jest z wydarzenia **16.08.2026, iGranie w Lochu, Gdynia**; autor/operator wszystkich czterech klipów pozostaje **nieznany**. W każdym przypadku `VENUE IDENTIFIABLE: YES` — przez podpis i swoiste wnętrze; w żadnym WebP nie stwierdzono czytelnego logo lokalu. Brak logo nie zamyka bramki. Każdy status publikacji w prywatnym manifeście pozostaje do ustalenia (`pending`).

| Asset ID — repo → źródło | Trasy i UI | Ludzie, lokal, znaki/treści w tle | Copyright / osoby / lokal i materiały / ogólny | Najmniejszy kolejny krok i fallback |
| --- | --- | --- | --- | --- |
| **IGR-C0020** `public/media/events/2026-08-16-igranie/experience-group-chorus.webp` → `C0020.MP4`, ok. 0,75 s. Poster i pętla z tego samego źródła są nieużywane. | `/` hero, normal/reduced motion. | **B:** dwie rozpoznawalne osoby śpiewające. Rozmyta postać/dekoracja z tyłu: **D**, sprawdzić pełny oryginał. Wnętrze i podpis identyfikują lokal. Za osobami obraz/dekoracja w ramie, autor nieustalony; brak czytelnego obcego logo. | `UNKNOWN` / `RED` / `RED` / **`RED`**. Brak licencji operatora, dowodów osób i zgody na wnętrze/dekorację. | Ustalić autora i referencję `C0020`, licencję dla dokładnego WebP oraz cropów, potwierdzić podstawę publikacji obu osób i stanowisko lokalu; ocenić tło. **Brak bezpieczniejszego gotowego zamiennika** — poster/RAW pokazują podobne osoby i miejsce. |
| **IGR-C0015** `public/media/events/2026-08-16-igranie/experience-social.webp` → manifest `C0015.MP4`, dokładny timecode nieznany. | `/`, sekcja „Być na miejscu”. | **B:** dwie rozpoznawalne uczestniczki. Wnętrze; wyeksponowana zbroja/dekoracja i duży obraz/mural. Ich autorstwo/uprawnienia nieznane. Brak czytelnego logo. | `UNKNOWN` / `RED` / `RED` / **`RED`**. Widoczna praca wymaga osobnego rozstrzygnięcia. | Ustalić timecode, autora/licencję, osoby i zgodę lokalu; zweryfikować właściciela dekoracji. **LEGAL CONFIRMATION REQUIRED** dla muralu. Brak repozytoryjnego odpowiednika tej sceny bez osób i dekoracji. |
| **IGR-C0016** `public/media/events/2026-08-16-igranie/experience-solo.webp` → manifest `C0016.MP4`, timecode nieznany. | `/`, sekcja „Wziąć mikrofon”; `/karaoke`, hero/instrukcja. | **B:** jeden wyraźny profil śpiewającego. **D:** siedzący widz i fragment innych osób w tle — ocenić oryginał oraz oba responsive cropy. Wnętrze, prześwietlony ekran, nieczytelne oznaczenia/pudełka na półkach. | `UNKNOWN` / `RED` / `RED` / **`RED`**. Nie ma licencji operatora, potwierdzenia osób i lokalu. | Ustalić timecode/autora/licencję, osoby w tle, zakres lokalu i oznaczeń. Brak gotowego zamiennika o niższej niepewności. |
| **IGR-C0014** `public/media/events/2026-08-16-igranie/igranie-case-study.webp` → manifest `C0014.MP4`, timecode nieznany. | `/`, archiwum; `/dla-lokali`, kadr rzeczywistej realizacji. | **B:** rozpoznawalna śpiewająca. **D:** częściowo widoczna osoba przy sprzęcie. Wnętrze i ekran; na ekranie czytelny fragment tekstu piosenki „Mr. Brightside”. Brak czytelnego logo lokalu. | `UNKNOWN` / `RED` / `RED` / **`RED`**. Zgoda na opis współpracy nie obejmuje zdjęcia; treść ekranu wymaga osobnej oceny. | Ustalić timecode/autora/licencję, osoby i lokal; **LEGAL CONFIRMATION REQUIRED** dla tekstu/ekranu albo później zatwierdzić wersję bez tej treści. Brak gotowego zamiennika o tej samej funkcji. |

Nie przypisano nikomu imienia na podstawie twarzy; nie prowadzono rozpoznawania twarzy. Liczba osób dotyczy WebP, nie całych klipów źródłowych. Jedna osoba może powtarzać się między ujęciami — prywatny manifest powinien ustalić to bez danych osobowych w repo.

### Hero — decyzja źródłowa i wydaniowa

Aktualny eksport hero to dokładnie `experience-group-chorus.webp` (`IGR-C0020`), a nie zachowany `experience-group-poster.webp` ani proponowany RAW `3SM08904.ARW`. Zdjęcie odpowiada klatce około 0,75 s lokalnego eksportu pętli wskazanego przez manifest jako pochodna `C0020.MP4` z iGrania w Lochu, **16.08.2026**. Dwie osoby na pierwszym planie są rozpoznawalne; szczegół rozmytego tła wymaga oceny oryginału. Wnętrze oraz podpis identyfikują lokal. Widoczna jest rozmyta dekoracja/obraz w ramie — obecnie nie ustalono, czy jest to istotnie przedstawiona cudza praca; nie ma czytelnego tekstu piosenki ani logo trzeciej marki. Copyright/operator `UNKNOWN`, publikacja osób `RED`, lokal/dekoracja `RED`, wynik **`RED`**. **HERO CURRENTLY BLOCKS MEDIA RIGHTS GATE: YES.** Bez potwierdzenia nie przenosić go do Production.

## Pozostałe media publiczne

| Asset ID / plik | Użycie i pochodzenie | Copyright / osoby / lokal lub marka / ogólny | Kolejny krok |
| --- | --- | --- | --- |
| **BRAND-LOGO** `public/brand/poza-nuta-logo.svg` | Dostarczony prawdziwy znak, nie rekonstrukcja. Header/footer wszystkich tras (także prawnych), pas na `/`, `Organization.logo`, OG. Projekt/autor nieudokumentowany. Wybór znaku potwierdzają `PRODUCT.md`, `DESIGN.md`, decyzje właściciela i commit `b60d0f3` z 24.09.2026; to nie jest łańcuch praw. **E:** brak osób. | `YELLOW` / `N/A` / `N/A` / **`YELLOW`** — istnieje źródło pliku i decyzja o użyciu, ale nie ma zapisu uprawnionego twórcy/podmiotu i zakresu website/OG. | Właściciel wskazuje pochodzenie oryginału i referencję prawa Poza Nutą do publikowania go na stronie/share image. Typograficzny fallback wymagałby osobnej zmiany UI. |
| **BRAND-ICON** `public/icon.svg` | Favicon i manifest wszystkich tras; własny prosty układ różowego kwadratu i koła zapisany w commicie `b230d19` z 23.09.2026. **E:** brak osób i obcego materiału. | `N/A` / `N/A` / `N/A` / **`N/A`** dla zewnętrznych praw medialnych; to nie jest ustalenie praw do całej marki. | Bez dodatkowej czynności w tej bramce. |

**OG/Twitter:** `src/app/opengraph-image.tsx` generuje PNG 1200 × 630 z tekstu, kolorów i `BRAND-LOGO`; `src/lib/seo.ts` wskazuje go na wszystkich stronach. Nie ma w nim osób ani eventu. Dziedziczy `YELLOW` znaku, bez nowej bramki wizerunkowej. Zrzut i source potwierdzają brand-only. `BRAND-ICON` jest odrębny. Na `/kontakt`, `/linki`, stronach prawnych i publicznym 404 nie ma dodatkowych fotografii; korzystają ze wspólnego znaku/favikony/OG.

**Responsive:** `<Image>` wskazuje te same cztery WebP przy wszystkich szerokościach. CSS zmienia crop, a Next dostarcza wersję skompresowaną. Zgody/ocena osób muszą obejmować realne kadry 390/1440 i wszelkie późniejsze zmiany cropu; nie tworzyć spraw dla samego kodeku.

## Macierz czterech odrębnych bramek

| Aktualnie renderowane źródło | Copyright / autor | Publikacja osób | Lokal / branding | Cudza treść w kadrze |
| --- | --- | --- | --- | --- |
| `IGR-C0020` — hero | `UNKNOWN`: operator/zakres nieustalony | `RED`: 2 osoby na pierwszym planie; tło do sprawdzenia | `RED`: wnętrze i nazwa w podpisie; czytelnego logo brak | `UNKNOWN`: rozmyty obraz/dekoracja w tle istnieje, znaczenie i uprawniony podmiot wymagają oceny |
| `IGR-C0015` — stolik | `UNKNOWN` | `RED`: 2 rozpoznawalne osoby | `RED`: wnętrze; czytelnego logo brak | `RED`: **prominentny** obraz/mural i zbroja/dekoracja, autor i zakres nieznane |
| `IGR-C0016` — solista | `UNKNOWN` | `RED`: 1 osoba z przodu, osoby w tle do oceny | `RED`: wnętrze; oznaczenia na półkach nieczytelne | `UNKNOWN`: ekran bez czytelnej treści i nieczytelne etykiety — potwierdzić na źródle/cropach |
| `IGR-C0014` — archiwum/B2B | `UNKNOWN` | `RED`: 1 osoba z przodu, osoba przy sprzęcie do oceny | `RED`: wnętrze; wąska zgoda na **opis** realizacji nie obejmuje medium | `RED`: czytelny fragment tekstu piosenki na ekranie, osobny od wizerunków; **LEGAL CONFIRMATION REQUIRED** albo nowa wersja bez treści |
| `BRAND-LOGO` — header/footer/OG | `YELLOW`: własny znak projektu według repo i decyzji właściciela, łańcuch twórca → prawo użycia nieudokumentowany | `N/A` | `N/A`: brak lokalu/obcej marki | `N/A` |
| `BRAND-ICON` — favicon | `N/A`: prosty SVG powstał w repo | `N/A` | `N/A` | `N/A` |

`UNKNOWN` w kolumnie cudzej treści oznacza obserwowany element o nieustalonym znaczeniu/uprawnionym podmiocie, nie domniemaną licencję. Status całości każdego z czterech WebP pozostaje `RED`. OG ma wyłącznie znak `BRAND-LOGO` i tekst, więc dziedziczy jego `YELLOW`, nie bramki zdjęć.

## Braki, działania i fallback

1. **Operator/twórca:** dla `C0020/C0015/C0016/C0014` ustalić autora, uprawniony podmiot, oryginał, timecode eksportu, decyzję pozwalającą użyć dokładnego WebP w website i cropach, czas i ograniczenia. Dla znaku wskazać twórcę i zakres prawa użycia. RAW/klipy na Drive i plik w repo nie są takimi decyzjami.
2. **Osoby:** dla każdej **B** i po weryfikacji każdego **D** zarejestrować w prywatnej ewidencji kod osoby/dowodu, asset ID, wersję/crop i decyzję owner/legal o wystarczalności podstawy publikacji w website. Udział w wydarzeniu, rola zespołowa i brak sprzeciwu nie są dowodem. **LEGAL CONFIRMATION REQUIRED.**
3. **Lokal i tło:** potwierdzić u uprawnionego przedstawiciela lokalu użycie wnętrza w czterech kadrach oraz nazwę w podpisach. Osobno rozstrzygnąć mural/zbroję `C0015`, obraz `C0020`, tekst utworu/ekran `C0014`, ewentualne oznaczenia `C0016`. Zgoda lokalu nie zastępuje decyzji właściciela cudzej pracy. **LEGAL CONFIRMATION REQUIRED.**
4. **Wpis release:** w prywatnym manifeście przy każdym asset ID zachować `pending / approved / restricted / rejected`, kod dowodu, zatwierdzającego, datę, zakres `website` i osobno ewentualny `social`/`paid`, dozwolone cropy, ograniczenia oraz przyjętą przez owner/legal procedurę zmiany/wycofania. Do repo przenieść wyłącznie zredagowany status i zakres. Status `GREEN` dopiero po takiej weryfikacji.

**Fallbacki dla czterech `RED`:** obecne repo nie ma gotowego prawdziwego kadru o mniejszej niepewności, zachowującego tę samą funkcję dokumentalną. Poster/pętla `C0020`, kandydaci RAW i `experience-duet.webp` (tylko w ZIP) pokazują tę samą sesję, osoby lub lokal. Sam crop może ograniczyć widoczny ekran/mural/widza, ale nie rozwiązuje autora, głównego wizerunku i wnętrza. Jeśli potwierdzeń nie da się uzyskać, osobna decyzja powinna dotyczyć nowego rzeczywistego materiału z pełnym pakietem praw albo zmiany zakresu wizualnego. Nie używać stocku/generowanych scen. Ten audyt nie zmienił assetów.

## HUMAN RIGHTS-CLEARANCE ACTION PACK

Każde poniższe pytanie dotyczy **aktualnej wersji WebP i kadrowania strony**, nie całego archiwum. Akceptowalny ślad to identyfikowalna pisemna odpowiedź e-mail/Messenger/WhatsApp, istniejący zapis umowy lub inny zapis decyzji uprawnionego podmiotu; owner/legal ocenia jej wystarczalność. Nie wymagać nowej umowy wyłącznie dla formy. Dowody prywatne pozostają poza repo.

### `IGR-C0020` — `experience-group-chorus.webp`, `/` hero

- **Copyright / twórca:** brak operatora i zakresu eksportu. **Kto:** `TO BE IDENTIFIED`. **Pytanie:** „Kto wykonał `C0020.MP4` i czy uprawniony podmiot potwierdza publikację dokładnego kadru `experience-group-chorus.webp` na `pozanuta.pl` po zwykłym resize/crop/WebP, z informacją o oznaczeniu autora?” **Dowód:** pisemne potwierdzenie twórcy/uprawnionego podmiotu powiązane z plikami.
- **Osoby:** dwie rozpoznawalne osoby z przodu oraz niejasne tło. **Kto:** osoby/podmioty uprawnione `TO BE IDENTIFIED`. **Pytanie:** „Czy potwierdzają publikację tego kadru i jego mobilnego/desktopowego cropu w hero Poza Nutą?” **Dowód:** odrębny zapis dla każdej osoby/podstawy w prywatnym manifeście; najpierw ocenić tło na pełnym źródle.
- **Lokal i tło:** wnętrze, nazwa w podpisie, rozmyty obraz. **Kto:** uprawniony przedstawiciel iGranie w Lochu; autor obrazu `TO BE IDENTIFIED`, jeśli ocena wskaże istotne przedstawienie. **Pytanie:** „Czy lokal potwierdza użycie tego konkretnego ujęcia wnętrza w hero i czy potrafi wskazać właściciela obrazu w tle?” **Dowód:** pisemne potwierdzenie zakresu lokalu oraz decyzja owner/legal o dekoracji.

### `IGR-C0015` — `experience-social.webp`, `/` stolik

- **Copyright / twórca:** `C0015.MP4`, dokładna klatka i operator nieustalone. **Kto:** `TO BE IDENTIFIED`. **Pytanie:** „Kto wykonał źródło i czy może potwierdzić publikację tego WebP/cropów na stronie Poza Nutą?” **Dowód:** pisemna odpowiedź powiązana z `C0015` i eksportem oraz wpis timecode.
- **Osoby:** dwie rozpoznawalne uczestniczki. **Kto:** `TO BE IDENTIFIED`. **Pytanie:** „Czy każda potwierdza publikację wskazanego kadru stolika na `pozanuta.pl`?” **Dowód:** dwa odpowiednio powiązane prywatne zapisy.
- **Lokal / prominentna sztuka:** wnętrze, zbroja i mural/obraz dominują w tle. **Kto:** uprawniony przedstawiciel iGranie; autor/uprawniony do pracy `TO BE IDENTIFIED`. **Pytanie:** „Czy lokal potwierdza ujęcie wnętrza oraz kto może rozstrzygnąć publikację widocznej dekoracji i muralu?” **Dowód:** pisemna odpowiedź lokalu i — jeśli wymagana po ocenie — uprawnionego do pracy; **HUMAN/LEGAL CONFIRMATION**.

### `IGR-C0016` — `experience-solo.webp`, `/` i `/karaoke`

- **Copyright / twórca:** `C0016.MP4`, timecode i operator nieustalone. **Kto:** `TO BE IDENTIFIED`. **Pytanie:** „Kto wykonał klip i czy potwierdza użycie dokładnego eksportu w dwóch miejscach na stronie oraz zwykłych cropów?” **Dowód:** pisemne potwierdzenie zakresu i wpis timecode.
- **Osoby:** rozpoznawalny śpiewający, widz oraz fragment innych osób wymagają oceny. **Kto:** `TO BE IDENTIFIED`. **Pytanie:** „Czy publikacja tego kadru obejmuje wskazanego śpiewającego i każdą osobę, która pozostaje rozpoznawalna w finalnych cropach?” **Dowód:** prywatne potwierdzenia albo udokumentowana decyzja owner/legal po obejrzeniu oryginału i obu viewportów.
- **Lokal / oznaczenia:** wnętrze, ekran bez czytelnej treści, pudełka po prawej. **Kto:** uprawniony przedstawiciel iGranie; właściciel ewentualnego znaku `TO BE IDENTIFIED`. **Pytanie:** „Czy lokal potwierdza użycie wnętrza i czy po sprawdzeniu oryginału widoczne oznaczenia lub ekran wymagają odrębnego rozstrzygnięcia?” **Dowód:** pisemna odpowiedź lokalu i decyzja owner/legal na podstawie źródła.

### `IGR-C0014` — `igranie-case-study.webp`, `/` i `/dla-lokali`

- **Copyright / twórca:** `C0014.MP4`, timecode i operator nieustalone. **Kto:** `TO BE IDENTIFIED`. **Pytanie:** „Kto wykonał źródło i czy potwierdza użycie tego konkretnego eksportu na obu trasach?” **Dowód:** pisemne potwierdzenie powiązane z oryginałem i WebP.
- **Osoby:** rozpoznawalna śpiewająca i osoba przy sprzęcie do oceny. **Kto:** `TO BE IDENTIFIED`. **Pytanie:** „Czy publikacja tego kadru ma potwierdzoną podstawę dla każdej rozpoznawalnej osoby także po cropie?” **Dowód:** prywatny zapis per osoba oraz ocena pełnej klatki.
- **Lokal:** wnętrze i nazwa w case study. **Kto:** uprawniony przedstawiciel iGranie. **Pytanie:** „Czy lokal potwierdza użycie tego kadru jako dokumentacji realizacji na `/` i `/dla-lokali`?” **Dowód:** pisemne potwierdzenie dotyczące obrazu, nie tylko nazwy.
- **Tekst utworu/ekran:** czytelny fragment to osobna kategoria od osób i lokalu. **Kto:** podmiot mogący upoważnić do treści `TO BE IDENTIFIED`; owner/legal do decyzji. **Pytanie:** „Czy ten widoczny fragment może pozostać na publikowanym kadrze, czy należy użyć kadru bez czytelnej treści?” **Dowód:** ocena prawna/pisemna decyzja i, jeśli potrzeba, uprawnienie do treści albo zatwierdzony nowy kadr. **LEGAL CONFIRMATION REQUIRED; REPLACE/CROP IF UNRESOLVED.**

### `BRAND-LOGO` — `public/brand/poza-nuta-logo.svg`

- **Łańcuch prawa użycia:** projektowy prawdziwy znak jest w repo i zatwierdzony w kierunku marki, lecz brak źródła twórcy/licencji. **Kto:** właściciel Poza Nutą; autor/uprawniony twórca `TO BE IDENTIFIED`. **Pytanie:** „Kto dostarczył oryginalny SVG i jaka pisemna decyzja potwierdza użycie go przez Poza Nutą na stronie, w OG i danych organizacji?” **Dowód:** źródłowy plik/wiadomość przekazania plus pisemne potwierdzenie uprawnionego podmiotu, zakresu i ewentualnego oznaczenia.

## Macierz fallbacków aktualnych kadrów

| Asset | Czy układ może działać po usunięciu? | Istniejący prawdziwy zamiennik | Crop a cudza treść | Czy zamiennik tworzy nową bramkę osób? |
| --- | --- | --- | --- | --- |
| `IGR-C0020` hero | Technicznie tak, ale wizualna/marketingowa decyzja wymagałaby osobnego zadania; obecna kompozycja ma pole fotografii. | Poster i RAW to ta sama sesja; **brak gotowego bezpieczniejszego odpowiednika**. | Ciasny crop może ograniczyć rozmyty obraz w tle, lecz dwóch śpiewających i lokal pozostają; nie zatwierdzono go. | Tak — poster/RAW nadal pokazują osoby. |
| `IGR-C0015` stolik | Technicznie tak po osobnej zmianie sekcji; utrata dowodu uczestnictwa bez śpiewania. | Brak w repo. | Ciaśniejszy kadr osób może zmniejszyć ekspozycję muralu/zbroi, ale w aktualnym WebP nie daje pewnego czystego kadru bez naruszenia sceny. Alternatywna klatka `C0015` nie została zweryfikowana. | Tak — każda wersja tej sceny nadal pokazuje dwie osoby. |
| `IGR-C0016` solista | `/karaoke` hero i karta `/` straciłyby dowód występu; wymagałoby osobnego ułożenia treści. | Brak w repo o tej funkcji i niższej niepewności. | Crop może ograniczyć widza/półki, ale pozostaje główny śpiewający i wnętrze; ocenę trzeba zrobić w rzeczywistych viewportach. | Tak. |
| `IGR-C0014` case study | Tekstowy opis realizacji może pozostać, ale kompozycja archiwum/B2B wymagałaby osobnego dostosowania. | Brak gotowego zamiennika w repo. Inna klatka `C0014` jest kandydatem **do sprawdzenia**, nie zatwierdzonym assetem. | Sam poziomy crop dostępnego pionowego WebP prawdopodobnie nie usunie ekranu nad śpiewającą bez utraty kontekstu; nie stwierdzono gotowego cropu. Inna klatka lub nowy crop źródła może usunąć tekst tylko po osobnej selekcji. | Tak — śpiewająca pozostanie rozpoznawalna. |

Nie wybrano fallbacku i nie edytowano obrazu. Nowa klatka/crop wymaga ponownej oceny praw, jakości i zgodności z rzeczywistym wydarzeniem. Nie używać generowanego dowodu wydarzenia.

## Gotowe prośby po polsku (nie umowy)

**Autor/operator lub uprawniony podmiot — klipy i osobno logo:**

> Cześć! Ustalamy prawa do `[C0020/C0015/C0016/C0014.MP4; podgląd kadru]` z iGrania 16.08.2026. Czy to Ty nagrałeś/nagrałaś materiał albo możesz potwierdzić, kto dysponuje prawami? Czy Poza Nutą może opublikować wskazany kadr na `pozanuta.pl`, także po zwykłym resize, cropie i kompresji do WebP? Czy potrzebny jest podpis autora? Daj też proszę osobną odpowiedź, czy ten sam kadr można użyć w promocyjnych postach społecznościowych. Jeśli są ograniczenia czasowe lub inne, napisz jakie. Zachowamy Twoją odpowiedź jako potwierdzenie zakresu.

**Rozpoznawalna osoba — konkretny kadr:**

> Cześć! Na zdjęciu `[asset ID i podgląd]` z wieczoru Poza Nutą w iGraniu 16.08.2026 jesteś rozpoznawalny/rozpoznawalna. Chcielibyśmy pokazać ten konkretny kadr na `pozanuta.pl` jako dokumentację wydarzenia, także w wersji przyciętej na telefon. Czy potwierdzasz taki zakres publikacji? Posty społecznościowe lub reklamy uzgodnimy osobno, jeśli będą planowane. W razie pytań lub zmiany decyzji napisz do `[kontakt wskazany przez Poza Nutą]`.

**Lokal / uprawniony przedstawiciel:**

> Cześć! Przygotowujemy stronę Poza Nutą z dokumentacją wieczoru w iGraniu z 16.08.2026. Czy jako uprawniony przedstawiciel lokalu potwierdzasz użycie zdjęć `[asset ID i podglądy]` z widocznym wnętrzem i nazwą lokalu na `pozanuta.pl`? Czy widoczne dekoracje, obraz/mural, ekran lub oznaczenia mają ograniczenia, o których powinniśmy wiedzieć, i do kogo należą prawa do tych elementów? Promocyjne posty społecznościowe potwierdzimy osobno, jeśli będą potrzebne. Nie traktujemy tej odpowiedzi jako zgody osób ze zdjęć.

**Widoczna praca/treść osoby trzeciej — jeśli owner/legal zdecyduje o zachowaniu w kadrze:**

> Cześć! Na zdjęciu `[asset ID, podgląd]` z iGrania jest wyraźnie widoczny `[mural/dekoracja/tekst na ekranie]`. Kto może potwierdzić, czy Poza Nutą może pokazać ten element jako część zdjęcia na `pozanuta.pl`? Jeśli nie da się tego potwierdzić, wybierzemy w osobnym kroku kadr bez tego elementu. Ta wiadomość dotyczy tylko wskazanego zdjęcia i strony www.

Forma i wystarczalność odpowiedzi, podstawa publikacji osób oraz ewentualny tryb cofnięcia pozostają do decyzji osoby odpowiedzialnej za prawa: **LEGAL CONFIRMATION REQUIRED**.

## Wynik bramki dla obecnego renderu

MEDIA RIGHTS EVIDENCE COMPLETE: NO

Blokują **wyłącznie aktualnie renderowane** `IGR-C0020` (`experience-group-chorus.webp`), `IGR-C0015` (`experience-social.webp`), `IGR-C0016` (`experience-solo.webp`) i `IGR-C0014` (`igranie-case-study.webp`) oraz niedomknięty zakres prawa do `BRAND-LOGO` używanego na stronie i w OG. Nieużywany poster i MP4 nie są osobnymi blockerami; przynależność hero do `C0020` jest jednak częścią jego sprawy. Wynik może zmienić wyłącznie udokumentowana, oceniona przez owner/legal decyzja dla właściwego assetu i zakresu albo późniejsza osobno zatwierdzona zmiana materiału.
