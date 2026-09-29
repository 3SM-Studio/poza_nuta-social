import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { publicPage } from "@/lib/public-paths";
import { ConsentPreferences } from "@/components/consent-controls";
import { StructuredData } from "@/components/structured-data";
import { privacyConfig } from "@/lib/privacy-config";
import { publicMetadata, publicPageGraph } from "@/lib/seo";

const description = "Informacje o przetwarzaniu danych podczas korzystania ze strony Poza Nutą i o prawach odwiedzających.";
export const metadata: Metadata = publicMetadata(publicPage.privacy, "Prywatność", description);

export default function PrivacyPage() {
  const config = privacyConfig();
  return <>
    <StructuredData data={publicPageGraph(publicPage.privacy, "Prywatność", description)} />
    <LegalPage title="Prywatność" heading="Prywatność" intro="Wyjaśniamy, jakie informacje powstają podczas korzystania ze strony Poza Nutą, kontaktu e-mail i panelu administratora.">
      <section>
        <h2>Administrator danych i kontakt</h2>
        <p>{config.controller || "Administratorem danych jest Michał Szwindowski, prowadzący projekt Poza Nutą w ramach działalności nierejestrowanej."}</p>
        {config.address ? <p>{config.address}</p> : null}
        <p>W sprawach prywatności napisz na <a href={`mailto:${config.contact || "michal.szwindowski@pozanuta.pl"}`}>{config.contact || "michal.szwindowski@pozanuta.pl"}</a>. Ogólne pytania i propozycje współpracy przyjmujemy pod adresem <a href="mailto:hello@pozanuta.pl">hello@pozanuta.pl</a>.</p>
      </section>
      <section>
        <h2>Odwiedzanie strony</h2>
        <p>Infrastruktura potrzebuje danych technicznych żądania, aby wyświetlić stronę i chronić usługę. Dostawca hostingu może przetwarzać adres IP i dane żądania w swoich logach. Nasza baza analityczna nie zapisuje surowego adresu IP; nie oznacza to, że adres IP nie jest przetwarzany przez dostawców infrastruktury.</p>
        <p>Bez potwierdzonej zgody na analitykę zapisujemy tylko niezależne zdarzenia: wejście na publiczną stronę, wyświetlenie lub użycie kontaktu, wejście przez nasz link kampanii lub QR oraz wybór oficjalnego kanału. Zdarzenie może zawierać czas, ścieżkę, domenę strony odsyłającej, oznaczenie źródła z bieżącego wejścia i identyfikator użytego linku. Nie nadajemy wtedy identyfikatora odwiedzającego ani sesji, nie łączymy wizyt i nie dopinamy tych zdarzeń do późniejszej zgody. „Bez cookies analitycznych” nie jest obietnicą, że każde takie zdarzenie jest prawnie anonimowe.</p>
        <p>Po potwierdzeniu zgody możemy łączyć <strong>nowe</strong> zdarzenia w sesje i rozpoznawać powroty tej przeglądarki za pomocą losowego identyfikatora. Zapisujemy także źródło wejścia, użycie przycisków i wyświetlenie wybranych sekcji oraz ogólne kategorie urządzenia, przeglądarki i systemu. Nie stosujemy fingerprintingu, dokładnej lokalizacji, nagrywania sesji ani pikseli reklamowych. Pomiar po zgodzie opiera się na Twoim wyborze; podstawa dla ograniczonego pomiaru bez zgody i technicznych logów wymaga jeszcze potwierdzenia przed uruchomieniem strony w Production.</p>
      </section>
      <section>
        <h2>Kontakt, panel i wiadomości logowania</h2>
        <p>Na stronie kontaktowej otwieramy Twoją aplikację pocztową — strona nie wysyła formularza ani nie tworzy wpisu w CRM. Gdy faktycznie wyślesz wiadomość, w skrzynce Zoho przechowywane są podane przez Ciebie dane kontaktowe, treść i ewentualne załączniki, aby można było odpowiedzieć i prowadzić korespondencję.</p>
        <p>Dostęp do panelu wymaga konta Supabase Auth oraz osobnego, aktywnego uprawnienia administratora. Samo konto lub link logowania nie nadaje dostępu. Przetwarzane mogą być adres e-mail, dane logowania, rola, zaproszenie oraz zapis ważnych działań administracyjnych. Przygotowana ścieżka dostarczania wiadomości logowania i zaproszeń prowadzi przez Supabase i Resend z domeny auth.pozanuta.pl; rzeczywisty przepływ uruchomiony przez Supabase Auth będzie sprawdzony po uruchomieniu końcowego hosta. Są to wiadomości transakcyjne, bez treści marketingowych oraz bez włączonego śledzenia otwarć i kliknięć.</p>
      </section>
      <section>
        <h2>Ustawienia analityki i cofnięcie zgody</h2>
        <div className="not-typeset mt-5"><ConsentPreferences /></div>
        <p>Odmowa nie ogranicza dostępu do strony. Po cofnięciu zgody od razu kończymy nowy pomiar oparty na identyfikatorze sesji i przeglądarki. Usuwamy powiązane cookies z tej przeglądarki; jeżeli serwer jest chwilowo niedostępny, lokalny zapis odmowy wstrzymuje taki pomiar, a cookies są usuwane przy kolejnym poprawnym kontakcie z serwerem. Nadal mogą powstawać ograniczone, niezależne zdarzenia bez tych identyfikatorów.</p>
        <p>Cofnięcie zgody nie usuwa automatycznie wcześniejszych rekordów z serwera. Dowód udzielenia lub cofnięcia zgody może pozostać na czas określony w zatwierdzonej polityce przechowywania. W sprawie wcześniejszych danych możesz napisać na adres do spraw prywatności. Szczegóły pamięci przeglądarki podajemy na stronie <Link href={publicPage.cookies}>Cookies</Link>.</p>
      </section>
      <section>
        <h2>Dostawcy, miejsca przetwarzania i czas przechowywania</h2>
        <p>Vercel obsługuje stronę i żądania, Supabase przechowuje dane aplikacji i obsługuje logowanie, Resend dostarcza e-maile logowania, Cloudflare obsługuje DNS domeny, a Zoho odbiera korespondencję. Przeglądarka nie łączy się bezpośrednio z Supabase w ramach publicznej analityki — robi to serwer aplikacji. Cloudflare nie jest tu automatycznie pośrednikiem dla ruchu HTTP strony; zależy to od ustawień końcowego hosta.</p>
        <p>Projekt Supabase ma region Frankfurt. Wybrany w Resend region Irlandia dotyczy wysyłania wiadomości; Resend informuje, że przechowuje dane w USA. Sam wybór regionu europejskiego nie oznacza, że całość przetwarzania u wszystkich dostawców pozostaje w EOG. Szczegółowe podstawy ewentualnych transferów wymagają potwierdzenia przed publikacją Production.</p>
        {config.recipients ? <p>{config.recipients}</p> : null}
        {config.transfers ? <p>{config.transfers}</p> : null}
        <p>Cookies analityczne trwają od 30 minut do 180 dni, zależnie od rodzaju; pełna lista jest na stronie <Link href={publicPage.cookies}>Cookies</Link>. Zatwierdzona polityka przewiduje przechowywanie danych serwerowych:</p>
        <ul>
          <li>zdarzeń bez cookies analitycznych wraz z zapisanym w nich źródłem wejścia do 90 dni; surowych zdarzeń i danych źródła wejścia po zgodzie do 12 miesięcy, a sesji do 12 miesięcy od ich zakończenia;</li>
          <li>losowego identyfikatora powracającej przeglądarki do 12 miesięcy od ostatniej aktywności, a dowodów zgody lub jej cofnięcia do 24 miesięcy od ostatniej decyzji;</li>
          <li>wpisów diagnostycznych analityki do 30 dni, a liczników zbiorczych bez identyfikatorów osób, sesji i przeglądarek do 24 miesięcy;</li>
          <li>dziennika działań administratorów do 24 miesięcy; zaproszeń do 90 dni od przyjęcia, wygaśnięcia lub odwołania, a nieudanych zaproszeń do 90 dni od ostatniej próby wysyłki;</li>
          <li>konta i profilu administratora przez czas aktywnego dostępu, a po jego odebraniu do 30 dni; korespondencji do 24 miesięcy od ostatniej wiadomości.</li>
        </ul>
        <p>Dla zaproszeń oczekujących termin zacznie biec po ich przyjęciu, wygaśnięciu lub odwołaniu. Dawne tabele analityczne mają zostać usunięte do 90 dni po zweryfikowanym zakończeniu migracji, której jeszcze nie uznano za zakończoną. Korespondencja związana z trwającą współpracą, rozliczeniem, umową, obowiązkiem prawnym lub sporem może wymagać dłuższego przechowania. Resend podaje własny, niezależny okres 30 dni dla danych wiadomości i logów na standardowych planach.</p>
        <p>Okresy w polityce są górnymi granicami docelowymi, nie obietnicą usunięcia co do sekundy. Automatyczne usuwanie rekordów serwerowych nie zostało jeszcze wdrożone; nie przedstawiamy samych znaczników wygaśnięcia jako wykonanego usunięcia. Uruchomienie Production wymaga osobnego wdrożenia tej polityki.</p>
        {config.retention ? <p>{config.retention}</p> : null}
      </section>
      <section>
        <h2>Twoje prawa</h2>
        <p>Możesz poprosić o dostęp, sprostowanie, usunięcie lub ograniczenie danych, a w odpowiednich przypadkach wnieść sprzeciw, poprosić o przeniesienie danych albo cofnąć zgodę. Napisz na adres do spraw prywatności wskazany wyżej. Jeżeli mamy uzasadnione wątpliwości co do tożsamości, poprosimy tylko o informacje potrzebne do jej potwierdzenia. Masz też prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych.</p>
        <p>Niezależnych zdarzeń bez identyfikatora odwiedzającego lub sesji często nie da się wiarygodnie powiązać z konkretną osobą. Również losowy identyfikator przeglądarki sam w sobie nie wskazuje nazwiska. Wyjaśnimy zakres danych, który da się ustalić bez zbierania nowych, zbędnych informacji. Cofnięcie zgody nie zmienia zgodności wcześniejszego przetwarzania wykonanego na jej podstawie.</p>
        <p>Nie podejmujemy wobec odwiedzających wyłącznie automatycznych decyzji wywołujących skutki prawne lub podobnie istotne skutki.</p>
      </section>
    </LegalPage>
  </>;
}
