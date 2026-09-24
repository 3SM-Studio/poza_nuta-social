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
    <LegalPage title="Prywatność" heading="Prywatność" intro="Wyjaśniamy, co dzieje się z danymi przy korzystaniu z tej strony i jak zmienić wybór dotyczący analityki.">
      <section><h2>Ustawienia analityki</h2><div className="not-typeset mt-5"><ConsentPreferences /></div><p>Po wycofaniu zgody kończymy pomiar oparty na identyfikatorze sesji i przeglądarki oraz usuwamy cookies analityczne. Kolejne zdarzenia mogą być mierzone w ograniczonym trybie bez cookies analitycznych. Wcześniej zapisane dane wymagają osobnej obsługi zgodnie z obowiązującym okresem przechowywania i żądaniami dotyczącymi danych.</p></section>
      <section><h2>Administrator danych i kontakt</h2><p>{config.controller || "Dane administratora zostaną podane przed publikacją."}</p>{config.address ? <p>{config.address}</p> : null}<p>{config.contact ? <a href={`mailto:${config.contact}`}>{config.contact}</a> : "Kontakt do spraw prywatności zostanie podany przed publikacją."}</p></section>
      <section><h2>Kiedy przetwarzamy dane</h2><p>Przy wejściu na stronę infrastruktura obsługuje żądanie i może tworzyć techniczne logi potrzebne do dostarczenia i ochrony usługi. Zapis wyboru analityki pozwala uszanować Twoją decyzję przy kolejnych odwiedzinach. Te działania służą świadczeniu usługi, bezpieczeństwu i wykonaniu obowiązków prawnych.</p><p>Bez potwierdzonej zgody serwera zapisujemy ograniczone zdarzenia: odwiedzenie publicznej strony, wyświetlenie i użycie kontaktu, wejście z linku kampanii lub QR oraz wybór oficjalnego kanału. Zdarzenie może zawierać ścieżkę, czas, źródło bieżącego wejścia i identyfikator użytego linku. Nie nadajemy trwałego identyfikatora przeglądarki ani sesji, nie łączymy wizyt i nie stosujemy fingerprintingu. Ten pomiar nie używa cookies analitycznych.</p><p>Po potwierdzeniu zgody przez serwer pełniejsza analityka łączy nowe zdarzenia z losowym identyfikatorem sesji i przeglądarki, źródłem wejścia oraz ogólną kategorią urządzenia. Wcześniejszych zdarzeń bez zgody nie przypisujemy później do tej sesji ani przeglądarki.</p><p>Jeżeli napiszesz do nas e-mail, przetwarzamy treść wiadomości i dane kontaktowe potrzebne do udzielenia odpowiedzi. Podstawa zależy od celu kontaktu, w tym działań przed zawarciem umowy lub uzasadnionego interesu polegającego na prowadzeniu korespondencji.</p></section>
      <section><h2>Odbiorcy, transfery i czas przechowywania</h2><p>{config.recipients || "Kategorie odbiorców i dostawców infrastruktury zostaną potwierdzone przed publikacją."}</p><p>{config.transfers || "Informacja o ewentualnym przekazywaniu danych poza EOG zostanie potwierdzona przed publikacją."}</p><p>{config.retention || "Okresy przechowywania danych serwerowych zostaną zatwierdzone przed publikacją."}</p><p>Czasy ważności cookies podajemy osobno na stronie <Link href={publicPage.cookies}>Cookies</Link>.</p></section>
      <section><h2>Twoje prawa</h2><p>Możesz żądać dostępu do danych, ich sprostowania, usunięcia lub ograniczenia przetwarzania, a w odpowiednich przypadkach także przeniesienia danych i wnieść sprzeciw. Masz prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych. Zgodę na analitykę możesz wycofać w każdej chwili; nie wpływa to na zgodność wcześniejszego przetwarzania ze zgodą.</p><p>Nie podejmujemy wobec odwiedzających decyzji wyłącznie automatycznie, które wywoływałyby skutki prawne lub podobnie istotnie na nich wpływały.</p></section>
    </LegalPage>
  </>;
}
