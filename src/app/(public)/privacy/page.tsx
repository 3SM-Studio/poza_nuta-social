import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { publicPage } from "@/lib/public-paths";
import { TrackPageView } from "@/components/track-page-view";
import { ConsentPreferences } from "@/components/consent-controls";
import { StructuredData } from "@/components/structured-data";
import { privacyConfig } from "@/lib/privacy-config";
import { publicMetadata, publicPageGraph } from "@/lib/seo";

const description = "Informacje o przetwarzaniu danych podczas korzystania ze strony Poza Nutą i o prawach odwiedzających.";
export const metadata: Metadata = publicMetadata(publicPage.privacy, "Prywatność", description);

export default function PrivacyPage() {
  const config = privacyConfig();
  return <>
    <TrackPageView />
    <StructuredData data={publicPageGraph(publicPage.privacy, "Prywatność", description)} />
    <LegalPage title="Prywatność" heading="Prywatność" intro="Wyjaśniamy, co dzieje się z danymi przy korzystaniu z tej strony i jak zmienić wybór dotyczący analityki.">
      <section className="space-y-3"><h2 className="text-xl font-bold">Ustawienia analityki</h2><ConsentPreferences /><p>Po wycofaniu zgody zatrzymujemy przyszły pomiar i usuwamy identyfikatory analityczne z przeglądarki. Wcześniej zapisane dane wymagają osobnej obsługi zgodnie z obowiązującym okresem przechowywania i żądaniami dotyczącymi danych.</p></section>
      <section className="space-y-2"><h2 className="text-xl font-bold">Administrator danych i kontakt</h2><p>{config.controller || "Dane administratora zostaną podane przed publikacją."}</p>{config.address ? <p>{config.address}</p> : null}<p>{config.contact ? <a href={`mailto:${config.contact}`} className="font-bold underline underline-offset-4">{config.contact}</a> : "Kontakt do spraw prywatności zostanie podany przed publikacją."}</p></section>
      <section className="space-y-2"><h2 className="text-xl font-bold">Kiedy przetwarzamy dane</h2><p>Przy wejściu na stronę infrastruktura obsługuje żądanie i może tworzyć techniczne logi potrzebne do dostarczenia i ochrony usługi. Zapis wyboru analityki pozwala uszanować Twoją decyzję przy kolejnych odwiedzinach. Te działania służą świadczeniu usługi, bezpieczeństwu i wykonaniu obowiązków prawnych.</p><p>Po wyrażeniu zgody zapisujemy zdarzenia, takie jak odwiedzenie strony, wejście z linku kampanii lub QR oraz wybór oficjalnego kanału. Łączymy je z losowym identyfikatorem sesji i przeglądarki, źródłem wejścia oraz ogólną kategorią urządzenia. Podstawą analityki jest Twoja zgoda. Bez niej aplikacja nie zapisuje zdarzeń analitycznych.</p><p>Jeżeli napiszesz do nas e-mail, przetwarzamy treść wiadomości i dane kontaktowe potrzebne do udzielenia odpowiedzi. Podstawa zależy od celu kontaktu, w tym działań przed zawarciem umowy lub uzasadnionego interesu polegającego na prowadzeniu korespondencji.</p></section>
      <section className="space-y-2"><h2 className="text-xl font-bold">Odbiorcy, transfery i czas przechowywania</h2><p>{config.recipients || "Kategorie odbiorców i dostawców infrastruktury zostaną potwierdzone przed publikacją."}</p><p>{config.transfers || "Informacja o ewentualnym przekazywaniu danych poza EOG zostanie potwierdzona przed publikacją."}</p><p>{config.retention || "Okresy przechowywania danych serwerowych zostaną zatwierdzone przed publikacją."}</p><p>Czasy ważności cookies podajemy osobno na stronie <Link href={publicPage.cookies} className="font-bold underline underline-offset-4">Cookies</Link>.</p></section>
      <section className="space-y-2"><h2 className="text-xl font-bold">Twoje prawa</h2><p>Możesz żądać dostępu do danych, ich sprostowania, usunięcia lub ograniczenia przetwarzania, a w odpowiednich przypadkach także przeniesienia danych i wnieść sprzeciw. Masz prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych. Zgodę na analitykę możesz wycofać w każdej chwili; nie wpływa to na zgodność wcześniejszego przetwarzania ze zgodą.</p><p>Nie podejmujemy wobec odwiedzających decyzji wyłącznie automatycznie, które wywoływałyby skutki prawne lub podobnie istotnie na nich wpływały.</p></section>
    </LegalPage>
  </>;
}
