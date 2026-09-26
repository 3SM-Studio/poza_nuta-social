import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { PublicPageMain } from "@/components/public-page-main";
import { StructuredData } from "@/components/structured-data";
import { buttonVariants } from "@/components/ui/button";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { publicPage } from "@/lib/public-paths";

const title = "Karaoke w Trójmieście";
const description = "Przyjdź posłuchać lub zaśpiewać na karaoke Poza Nutą w Trójmieście. Sprawdź, jak zgłosić utwór na miejscu i gdzie znaleźć aktualne daty.";
export const metadata: Metadata = publicMetadata(publicPage.karaoke, title, description);

export default function KaraokePage() {
  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.karaoke, title, description)} />
      <PublicPageMain>
      <PublicBreadcrumb current={title} />
      <article className="flex-1 pb-20 pt-10 sm:pb-28 sm:pt-14">
        <div className="border-t border-accent pt-6">
          <h1 className="font-display max-w-[11ch] text-[clamp(3.75rem,11vw,6rem)] leading-[0.88] tracking-[-0.025em] text-foreground">Karaoke w Trójmieście</h1>
          <p className="mt-8 max-w-xl text-xl font-bold leading-snug sm:text-2xl">Przyjdź dla muzyki i ludzi. Śpiewanie jest Twoim wyborem.</p>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Możesz słuchać, spędzać czas z innymi i dołączyć do zabawy bez występu. Jeśli masz ochotę chwycić za mikrofon, nie musisz umieć śpiewać ani zapisywać się przez Poza Nutą przed przyjściem.</p>
        </div>

        <section className="mt-16 border-t pt-8 sm:mt-20" aria-labelledby="channels-heading">
          <h2 id="channels-heading" className="font-display text-4xl leading-none sm:text-5xl">Gdzie sprawdzić daty i miejsca?</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Po uzgodnieniu szczegółów z lokalem Poza Nutą przekazuje informacje o wydarzeniu. Na stronie z linkami znajdziesz nasze aktywne oficjalne profile. Sprawdź najnowszy komunikat przed wyjściem.</p>
          <Link href={publicPage.links} className={`${buttonVariants({ variant: "accent", size: "xl" })} mt-7 w-full justify-between whitespace-normal sm:w-auto`}>
            Przejdź do oficjalnych kanałów <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>

        <section className="mt-16 border-t pt-8 sm:mt-20" aria-labelledby="singing-heading">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">Dla chętnych do śpiewania</p>
          <h2 id="singing-heading" className="font-display mt-3 max-w-[13ch] text-4xl leading-none sm:text-5xl">Jak zgłosić utwór?</h2>
          <ol className="mt-8 border-t border-accent">
            {[
              ["01", "Przyjdź na wydarzenie", "Przed przyjściem nie rezerwujesz występu przez Poza Nutą."],
              ["02", "Zeskanuj QR na miejscu", "Wpisz sześciocyfrowy kod sesji dostępny podczas wydarzenia."],
              ["03", "Wybierz lub dodaj utwór", "Zgłoszony utwór trafia do kolejki."],
              ["04", "Poczekaj na swoją kolej", "Po wywołaniu możesz zaśpiewać wybraną piosenkę."],
            ].map(([number, heading, body]) => (
              <li key={number} className="grid gap-2 border-b py-5 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-5">
                <span className="pt-1 text-xs font-black tracking-[0.15em] text-accent">{number}</span>
                <div><h3 className="text-lg font-bold tracking-tight">{heading}</h3><p className="mt-1 max-w-lg text-base leading-7 text-muted-foreground">{body}</p></div>
              </li>
            ))}
          </ol>
          <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">Szczegóły udziału w konkretnym wieczorze sprawdź w jego aktualnym komunikacie.</p>
        </section>

        <section className="mt-16 border-t pt-8 sm:mt-20" aria-labelledby="venue-heading">
          <h2 id="venue-heading" className="text-xl font-bold tracking-tight">Chcesz zorganizować karaoke w lokalu?</h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">Jeśli reprezentujesz lokal w Trójmieście, zobacz informacje o współpracy i skontaktuj się z nami.</p>
          <Link href={publicPage.venues} className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-6 w-full justify-between whitespace-normal sm:w-auto`}>
            Współpraca z lokalami <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </article>
      </PublicPageMain>
    </>
  );
}
