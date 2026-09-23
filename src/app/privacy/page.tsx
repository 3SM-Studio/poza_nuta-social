import type { Metadata } from "next";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { ConsentPreferences } from "@/components/consent-controls";
import { StructuredData } from "@/components/structured-data";
import { publicMetadata, publicPageGraph } from "@/lib/seo";

const description = "Jak Poza Nutą mierzy ruch i atrybucję kampanii na tej stronie oraz zarządza zgodą analityczną.";
export const metadata: Metadata = publicMetadata("/privacy", "Prywatność", description);

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-svh w-full max-w-2xl px-5 py-10 sm:px-7 sm:py-16">
      <StructuredData data={publicPageGraph("/privacy", "Prywatność bez kombinowania.", description)} />
      <PublicBreadcrumb current="Prywatność bez kombinowania." />
      <article className="mt-10 space-y-8">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">Poza Nutą</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Prywatność bez kombinowania.</h1>
        </header>
        <section className="space-y-3 text-sm leading-7 text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Co mierzymy</h2>
          <p>Mierzymy wejścia na stronę, źródło kampanii, kod linku lub QR oraz kliknięcie w wybrany oficjalny kanał Poza Nutą. Bez zgody pomiar pozostaje w obrębie krótkiej sesji; po zgodzie może używać losowego identyfikatora przeglądarki (pseudonimu) do rozpoznania jej powrotu.</p>
          <p>Przykład: możemy policzyć, że ktoś wszedł z konkretnego plakatu i później wybrał Instagram. Nie potrzebujemy do tego znać imienia tej osoby.</p>
        </section>
        <section className="space-y-3 text-sm leading-7 text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Czego celowo nie robimy</h2>
          <p>Nie zapisujemy surowych adresów IP, nie tworzymy odcisku urządzenia i nie próbujemy identyfikować konkretnej osoby na podstawie jej zachowania.</p>
        </section>
        <section className="space-y-3 text-sm leading-7 text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Sesja i dobrowolna analityka</h2>
          <p>Krótki identyfikator sesji wygasa po około 30 minutach braku aktywności. Bez zgody nie łączymy go z kolejnymi sesjami. Po zgodzie analitycznej losowy identyfikator przeglądarki może połączyć późniejszy powrót; nadal nie oznacza konkretnej osoby i znika po usunięciu danych przeglądarki.</p>
        </section>
        <section className="space-y-3 text-sm leading-7 text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Twoje ustawienie</h2>
          <p>Możesz włączyć analitykę lub wrócić do samych niezbędnych funkcji. Wycofanie zgody usuwa identyfikator przeglądarki i zatrzymuje przyszłe łączenie sesji; nie usuwa automatycznie wcześniej zagregowanych danych.</p>
          <ConsentPreferences />
        </section>
        <section className="space-y-3 text-sm leading-7 text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Urządzenie</h2>
          <p>Jeżeli dane są potrzebne do analityki technicznej, zapisujemy jedynie szerokie kategorie, np. telefon/komputer, rodzina przeglądarki i systemu. Nie przechowujemy dokładnego modelu ani nie tworzymy odcisku urządzenia.</p>
        </section>
      </article>
    </main>
  );
}
