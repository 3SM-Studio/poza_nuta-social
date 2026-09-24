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
      <section className="space-y-3"><h2 className="text-xl font-bold">Zmień wybór</h2><ConsentPreferences /><p className="text-muted-foreground">Odmowa i cofnięcie zgody nie ograniczają dostępu do strony. Po cofnięciu zgody usuwamy cookies analityczne z tej przeglądarki i nie zapisujemy kolejnych zdarzeń analitycznych.</p></section>
      <section className="space-y-4"><h2 className="text-xl font-bold">Pamięć przeglądarki</h2><p className="text-muted-foreground">Poniżej jest aktualny wykaz mechanizmów używanych przez aplikację. Są to cookies lub pamięć tej strony (first-party); nie uruchamiamy zewnętrznych trackerów marketingowych. Czas podany przy cookie jest czasem ważności w przeglądarce; nie oznacza automatycznego usunięcia danych zapisanych wcześniej na serwerze.</p>
        <h3 className="font-bold">Dla odwiedzających</h3>
        <div className="space-y-4">{storageInventory.filter((item) => item.audience === "public").map((item) => <div key={item.name} className="border-t pt-4"><h4 className="font-bold break-all">{item.name}</h4><p className="text-muted-foreground">{item.category} · {item.duration}</p><p>{item.purpose} {item.activation}.</p></div>)}</div>
        <h3 className="pt-3 font-bold">Tylko dla administratorów</h3>
        <div className="space-y-4">{storageInventory.filter((item) => item.audience === "admin").map((item) => <div key={item.name} className="border-t pt-4"><h4 className="font-bold break-all">{item.name}</h4><p className="text-muted-foreground">{item.category} · {item.duration}</p><p>{item.purpose} {item.activation}.</p></div>)}</div>
      </section>
      <section className="space-y-3"><h2 className="text-xl font-bold">Własne ustawienia przeglądarki</h2><p className="text-muted-foreground">Możesz także usuwać lub blokować cookies w ustawieniach przeglądarki. Zablokowanie mechanizmów niezbędnych może utrudnić zapamiętanie wyboru albo korzystanie z panelu administratora.</p><p>Więcej o przetwarzaniu danych znajdziesz na stronie <Link href={publicPage.privacy} className="font-bold underline underline-offset-4">Prywatność</Link>.</p></section>
    </LegalPage>
  </>;
}
