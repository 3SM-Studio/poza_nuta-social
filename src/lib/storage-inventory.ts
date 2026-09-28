// Public storage inventory. Keep this aligned with cookie writes and browser storage calls.
import {
  ANALYTICS_ACQUISITION_COOKIE,
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_INTERNAL_COOKIE,
  ANALYTICS_SESSION_COOKIE,
  ANALYTICS_TEST_COOKIE,
  ANALYTICS_VISITOR_COOKIE,
} from "./analytics-token";
import { CONSENT_PREFERENCE_COOKIE } from "./consent-preference";

export const storageInventory = [
  { name: ANALYTICS_CONSENT_COOKIE, audience: "public", category: "Niezbędne", duration: "180 dni", activation: "Po zapisaniu wyboru", purpose: "Zapamiętuje podpisany wybór analityki i wersję informacji o zgodzie." },
  { name: CONSENT_PREFERENCE_COOKIE, audience: "public", category: "Niezbędne", duration: "Do 180 dni; usuwane po potwierdzeniu zgody", activation: "Po odmowie albo podczas oczekiwania na potwierdzenie zgody", purpose: "Lokalnie wyłącza pełną analitykę lub przechowuje losowy identyfikator próby zapisu zgody; nie jest identyfikatorem odwiedzającego." },
  { name: ANALYTICS_SESSION_COOKIE, audience: "public", category: "Analityka", duration: "30 minut od ostatniej aktywności", activation: "Po zgodzie na analitykę", purpose: "Łączy zdarzenia jednej sesji po zgodzie." },
  { name: ANALYTICS_ACQUISITION_COOKIE, audience: "public", category: "Analityka", duration: "30 minut", activation: "Po zgodzie i wejściu ze zidentyfikowanego źródła", purpose: "Zachowuje źródło wejścia w ramach sesji po zgodzie." },
  { name: ANALYTICS_VISITOR_COOKIE, audience: "public", category: "Analityka", duration: "180 dni", activation: "Po zgodzie na analitykę", purpose: "Losowy identyfikator przeglądarki po zgodzie, używany do rozpoznania powrotu." },
  { name: "pn_hub_outbound_v1 (sessionStorage)", audience: "public", category: "Analityka", duration: "Do zamknięcia karty lub cofnięcia zgody", activation: "Po zgodzie i wyborze oficjalnego linku", purpose: "Pomaga rozpoznać powrót po otwarciu oficjalnego linku." },
  { name: "pn_consent_signal (localStorage)", audience: "public", category: "Niezbędne", duration: "Chwilowy zapis, usuwany od razu", activation: "Podczas zmiany wyboru", purpose: "Powiadamia inne otwarte karty o zmianie ustawienia, gdy standardowe powiadomienie przeglądarki nie jest dostępne." },
  { name: "Supabase Auth", audience: "admin", category: "Niezbędne dla administratorów", duration: "Zależnie od sesji logowania", activation: "Podczas logowania i korzystania z panelu", purpose: "Utrzymuje logowanie do panelu administracyjnego." },
  { name: "sidebar_state", audience: "admin", category: "Niezbędne dla administratorów", duration: "7 dni", activation: "Po zmianie układu nawigacji w panelu", purpose: "Zapamiętuje stan nawigacji panelu." },
  { name: ANALYTICS_INTERNAL_COOKIE, audience: "admin", category: "Ustawienie panelu", duration: "12 godzin; do 365 dni przy wybraniu wykluczenia urządzenia", activation: "Po wejściu zalogowanego administratora do panelu lub wybraniu wykluczenia", purpose: "Odróżnia ruch administratora od publicznego." },
  { name: ANALYTICS_TEST_COOKIE, audience: "admin", category: "Ustawienie panelu", duration: "2 godziny", activation: "Po włączeniu trybu testowego przez administratora", purpose: "Oznacza wybrany przez administratora tryb testowy analityki." },
] as const;
