import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ConsentReset } from "@/components/consent-controls";

export const metadata: Metadata = {
  title: "Prywatność",
  description: "Jak Poza Nutą mierzy anonimowy ruch i atrybucję kampanii na tej stronie.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-svh w-full max-w-2xl px-5 py-10 sm:px-7 sm:py-16">
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft aria-hidden="true" /> Wróć
      </Link>
      <article className="mt-10 space-y-8">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">Poza Nutą</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Prywatność bez kombinowania.</h1>
        </header>
        <section className="space-y-3 text-sm leading-7 text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Co mierzymy</h2>
          <p>Mierzymy anonimowe wejścia na stronę, źródło kampanii, kod linku lub QR oraz kliknięcie w wybraną oficjalną destynację Poza Nutą.</p>
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
          <p>Wycofanie zgody zatrzymuje przyszłe łączenie sesji i zewnętrzną analitykę. Nie jest obietnicą automatycznego usunięcia wcześniej zagregowanych danych.</p>
          <ConsentReset />
        </section>
        <section className="space-y-3 text-sm leading-7 text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Urządzenie</h2>
          <p>Jeżeli dane są potrzebne do analityki technicznej, zapisujemy jedynie szerokie kategorie, np. mobile/desktop, rodzina przeglądarki i systemu. Nie przechowujemy dokładnego modelu urządzenia ani pełnego profilu do fingerprintingu.</p>
        </section>
      </article>
    </main>
  );
}
