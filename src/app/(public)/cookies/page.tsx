import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { publicPage } from "@/lib/public-paths";
import { ConsentPreferences } from "@/components/consent-controls";
import { StructuredData } from "@/components/structured-data";
import { publicMetadata, publicPageGraph } from "@/lib/seo";

import { storageInventory } from "@/lib/storage-inventory";

const description = "Jak Poza Nutą używa cookies i pamięci przeglądarki oraz jak zmienić wybór dotyczący analityki.";
export const metadata: Metadata = publicMetadata(publicPage.cookies, "Cookies", description);

export default function CookiesPage() {
  return <>
    <StructuredData data={publicPageGraph(publicPage.cookies, "Cookies", description)} />
    <LegalPage title="Cookies" heading="Cookies na tej stronie" intro="Niezbędny zapis pamięta Twój wybór. Pełniejsza analityka korzysta z cookies dopiero po potwierdzeniu zgody przez serwer.">
      <section><h2>Zmień wybór</h2><div className="not-typeset mt-5"><ConsentPreferences /></div><p>Odmowa i cofnięcie zgody nie ograniczają dostępu do strony. Po cofnięciu zgody identyfikująca analityka zatrzymuje się od razu; cookies analityczne usuwamy w odpowiedzi serwera lub przy następnym udanym żądaniu, jeśli serwer był chwilowo niedostępny. Nadal możemy zapisać ograniczone zdarzenia bez cookies analitycznych, identyfikatora sesji lub przeglądarki, fingerprintingu i łączenia wizyt.</p></section>
      <section><h2>Pamięć przeglądarki</h2><p>Poniżej jest aktualny wykaz mechanizmów używanych przez aplikację. Są to cookies lub pamięć tej strony; nie uruchamiamy zewnętrznych trackerów marketingowych. Czas podany przy cookie jest czasem ważności w przeglądarce; nie oznacza automatycznego usunięcia danych zapisanych wcześniej na serwerze.</p><p>Własne cookies <code>pn_consent</code>, <code>pn_visitor</code>, <code>pn_session</code>, <code>pn_acquisition</code>, <code>pn_internal</code> i <code>pn_analytics_test</code> mają <code>HttpOnly</code> i <code>SameSite=Lax</code>; przy HTTPS także <code>Secure</code>. Cookie <code>pn_consent_preference</code> musi być dostępne dla skryptu strony, więc nie ma <code>HttpOnly</code>. Cookies Supabase Auth dla panelu również nie mają <code>HttpOnly</code> w obecnej bibliotece; mają <code>SameSite=Lax</code>, a aplikacja nie ustawia dla nich osobno flagi <code>Secure</code>. Cookie <code>sidebar_state</code> zapisuje przeglądarka bez jawnie ustawionych flag <code>HttpOnly</code>, <code>Secure</code> i <code>SameSite</code>.</p>
        <h3>Dla odwiedzających</h3>
        <div>{storageInventory.filter((item) => item.audience === "public").map((item) => <div key={item.name} className="border-t pt-4"><h4 className="break-all">{item.name}</h4><p>{item.category} · {item.duration}</p><p>{item.purpose} {item.activation}.</p></div>)}</div>
        <h3>Tylko dla administratorów</h3>
        <div>{storageInventory.filter((item) => item.audience === "admin").map((item) => <div key={item.name} className="border-t pt-4"><h4 className="break-all">{item.name}</h4><p>{item.category} · {item.duration}</p><p>{item.purpose} {item.activation}.</p></div>)}</div>
      </section>
      <section><h2>Własne ustawienia przeglądarki</h2><p>Możesz także usuwać lub blokować cookies w ustawieniach przeglądarki. Zablokowanie mechanizmów niezbędnych może utrudnić zapamiętanie wyboru albo korzystanie z panelu administratora.</p><p>Więcej o przetwarzaniu danych znajdziesz na stronie <Link href={publicPage.privacy}>Prywatność</Link>.</p></section>
    </LegalPage>
  </>;
}
