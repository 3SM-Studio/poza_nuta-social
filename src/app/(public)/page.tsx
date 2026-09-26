import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { StructuredData } from "@/components/structured-data";
import { buttonVariants } from "@/components/ui/button";
import { getPublicDestinations } from "@/lib/destinations";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { publicPage } from "@/lib/public-paths";
import { cn } from "cn";

const homeDescription = "Poza Nutą organizuje karaoke i wydarzenia muzyczne w Trójmieście. Poznaj nas, sprawdź informacje dla uczestników i lokali oraz skontaktuj się z nami.";
export const metadata: Metadata = publicMetadata(publicPage.home, "Poza Nutą — karaoke i wydarzenia muzyczne w Trójmieście", homeDescription);

const textLink = "inline-flex min-h-11 items-center gap-2 font-bold text-foreground underline decoration-accent underline-offset-4 transition-colors hover:text-accent";

export default async function HomePage() {
  const destinations = await getPublicDestinations();

  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.home, "Poza Nutą", homeDescription, { includeOrganization: true, destinations })} />
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        <section className="flex min-h-[min(36rem,calc(100svh-6rem))] flex-col justify-between border-b py-6 sm:min-h-[min(43rem,calc(100svh-6rem))] sm:py-16 lg:py-20" aria-labelledby="hero-title">
          <div className="flex items-start justify-between gap-6 border-t border-accent pt-4 text-sm font-bold uppercase tracking-[0.13em] text-muted-foreground">
            <span>Karaoke i muzyka</span><span className="text-right">Trójmiasto</span>
          </div>
          <div className="grid gap-4 py-8 sm:gap-9 sm:py-14 md:grid-cols-[minmax(0,1.35fr)_minmax(15rem,0.65fr)] md:items-end md:gap-12 lg:py-20">
            <h1 id="hero-title" className="font-display min-w-0 text-[clamp(4.5rem,13vw,6rem)] leading-[0.84] tracking-[-0.025em] text-foreground">Poza<br /><span className="text-accent">Nutą</span></h1>
            <div className="max-w-md md:pb-1">
              <p className="text-[clamp(1.5rem,2.6vw,2.25rem)] font-bold leading-[1.17] tracking-tight">Karaoke i wydarzenia muzyczne w Trójmieście.</p>
              <p className="mt-4 max-w-sm text-base leading-7 text-muted-foreground">Przyjdź posłuchać, spędzić czas z innymi albo zaśpiewać. Sprawdź, jak to działa i gdzie znaleźć aktualne daty.</p>
              <Link href={publicPage.karaoke} className={cn(buttonVariants({ variant: "accent", size: "xl" }), "mt-5 w-full justify-between whitespace-normal sm:mt-8 sm:w-auto sm:min-w-64")}>
                Informacje o karaoke <ArrowRight aria-hidden="true" />
              </Link>
              <Link href={publicPage.links} className={cn(textLink, "mt-3")}>Sprawdź aktualne daty <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-4 text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground">
            <span>Poza Nutą</span><span>Karaoke · Trójmiasto</span>
          </div>
        </section>

        <section className="grid gap-10 border-b py-20 sm:py-28 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] lg:items-end lg:gap-20" aria-labelledby="karaoke-heading">
          <h2 id="karaoke-heading" className="font-display max-w-[11ch] text-[clamp(3.75rem,7vw,6rem)] leading-[0.88] tracking-[-0.025em]">Nie musisz umieć śpiewać. <span className="text-accent">Musisz chcieć śpiewać.</span></h2>
          <div className="max-w-md lg:pb-1">
            <p className="text-xl font-bold leading-snug sm:text-2xl">Karaoke to wspólny czas przy muzyce, nie konkurs wokalny.</p>
            <p className="mt-5 text-base leading-7 text-muted-foreground">Możesz być częścią wieczoru bez występu. Jeśli zechcesz zaśpiewać, nie potrzebujesz doświadczenia ani wcześniejszych zapisów przez Poza Nutą.</p>
            <Link href={publicPage.karaoke} className={cn(textLink, "mt-7")}>Poznaj karaoke Poza Nutą <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="border-b py-20 sm:py-28" aria-labelledby="steps-heading">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">Jeśli chcesz zaśpiewać</p>
              <h2 id="steps-heading" className="font-display mt-4 max-w-[11ch] text-[clamp(3.5rem,6vw,5.5rem)] leading-[0.9]">Od przyjścia do mikrofonu.</h2>
            </div>
            <ol className="grid gap-0 border-t border-accent sm:grid-cols-2">
              {[
                ["01", "Przyjdź", "Nie zapisujesz się przez Poza Nutą przed przyjściem."],
                ["02", "Zeskanuj QR", "Na miejscu zeskanuj kod wydarzenia i wpisz sześciocyfrowy kod sesji."],
                ["03", "Wybierz utwór", "Wybierz lub dodaj piosenkę. Zgłoszenie trafi do kolejki."],
                ["04", "Zaśpiewaj", "Kiedy nadejdzie Twoja kolej, wywołamy Cię do występu."],
              ].map(([number, heading, body]) => (
                <li key={number} className="border-b py-6 sm:pr-6">
                  <span className="text-xs font-black tracking-[0.15em] text-accent">{number}</span>
                  <h3 className="mt-3 text-xl font-bold tracking-tight">{heading}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid gap-10 border-b py-20 sm:py-28 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] lg:gap-20" aria-labelledby="current-heading">
          <h2 id="current-heading" className="font-display max-w-[10ch] text-[clamp(3.5rem,6vw,5.5rem)] leading-[0.9]">Gdzie po aktualne informacje?</h2>
          <div className="max-w-xl border-t border-accent pt-7">
            <p className="text-xl font-bold leading-snug sm:text-2xl">Daty i miejsca sprawdzaj w aktualnych komunikatach na oficjalnych profilach.</p>
            <p className="mt-5 text-base leading-7 text-muted-foreground">Po ustaleniu szczegółów z lokalem to Poza Nutą przekazuje informacje o wydarzeniu. Aktywne kanały znajdziesz w jednym miejscu. Przed wyjściem sprawdź najnowszy komunikat.</p>
            <div className="mt-7 flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8">
              <Link href={publicPage.links} className={textLink}>Wszystkie oficjalne linki <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section className="grid gap-10 border-b py-20 sm:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.65fr)] lg:items-end lg:gap-20" aria-labelledby="venue-heading">
          <div>
            <h2 id="venue-heading" className="font-display max-w-[11ch] text-[clamp(3.5rem,6vw,5.5rem)] leading-[0.9]">Muzyka w Twoim lokalu?</h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">Prowadzisz lokal w Trójmieście? Możemy wspólnie ustalić format wydarzenia, jego prowadzenie i promocję oraz podział zadań na miejscu.</p>
          </div>
          <Link href={publicPage.venues} className={cn(textLink, "lg:justify-self-end")}>Współpraca z lokalami <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </section>

        <section className="flex flex-col items-start gap-8 py-20 sm:py-28 lg:flex-row lg:items-end lg:justify-between" aria-labelledby="final-heading">
          <div>
            <h2 id="final-heading" className="font-display max-w-[12ch] text-[clamp(3.5rem,7vw,6rem)] leading-[0.9]">Do zobaczenia przy muzyce.</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">Zobacz informacje dla uczestników i przejdź do aktualnych kanałów Poza Nutą.</p>
          </div>
          <Link href={publicPage.karaoke} className={cn(buttonVariants({ variant: "accent", size: "xl" }), "w-full justify-between whitespace-normal sm:w-auto")}>
            Informacje o karaoke <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      </main>
    </>
  );
}
