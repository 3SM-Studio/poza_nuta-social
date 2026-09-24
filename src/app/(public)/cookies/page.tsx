import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { publicPage } from "@/lib/public-paths";
import { TrackPageView } from "@/components/track-page-view";
import { ConsentPreferences } from "@/components/consent-controls";
import { StructuredData } from "@/components/structured-data";
import { publicMetadata, publicPageGraph } from "@/lib/seo";

import { storageInventory } from "@/lib/storage-inventory";

const description = "Jak Poza Nutą używa cookies i pamięci przeglądarki oraz jak zmienić wybór dotyczący analityki.";
export const metadata: Metadata = publicMetadata(publicPage.cookies, "Cookies", description);

export default function CookiesPage() {
  return <>
    <TrackPageView />
    <StructuredData data={publicPageGraph(publicPage.cookies, "Cookies", description)} />
    <LegalPage title="Cookies" heading="Cookies na tej stronie" intro="Niezbędny zapis pamięta Twój wybór. Analitykę uruchamiamy dopiero po Twojej zgodzie.">
      <section><h2>Zmień wybór</h2><div className="not-typeset mt-5"><ConsentPreferences /></div><p>Odmowa i cofnięcie zgody nie ograniczają dostępu do strony. Po cofnięciu zgody usuwamy cookies analityczne z tej przeglądarki i nie zapisujemy kolejnych zdarzeń analitycznych.</p></section>
      <section><h2>Pamięć przeglądarki</h2><p>Poniżej jest aktualny wykaz mechanizmów używanych przez aplikację. Są to cookies lub pamięć tej strony; nie uruchamiamy zewnętrznych trackerów marketingowych. Czas podany przy cookie jest czasem ważności w przeglądarce; nie oznacza automatycznego usunięcia danych zapisanych wcześniej na serwerze.</p>
        <h3>Dla odwiedzających</h3>
        <div>{storageInventory.filter((item) => item.audience === "public").map((item) => <div key={item.name} className="border-t pt-4"><h4 className="break-all">{item.name}</h4><p>{item.category} · {item.duration}</p><p>{item.purpose} {item.activation}.</p></div>)}</div>
        <h3>Tylko dla administratorów</h3>
        <div>{storageInventory.filter((item) => item.audience === "admin").map((item) => <div key={item.name} className="border-t pt-4"><h4 className="break-all">{item.name}</h4><p>{item.category} · {item.duration}</p><p>{item.purpose} {item.activation}.</p></div>)}</div>
      </section>
      <section><h2>Własne ustawienia przeglądarki</h2><p>Możesz także usuwać lub blokować cookies w ustawieniach przeglądarki. Zablokowanie mechanizmów niezbędnych może utrudnić zapamiętanie wyboru albo korzystanie z panelu administratora.</p><p>Więcej o przetwarzaniu danych znajdziesz na stronie <Link href={publicPage.privacy}>Prywatność</Link>.</p></section>
    </LegalPage>
  </>;
}
