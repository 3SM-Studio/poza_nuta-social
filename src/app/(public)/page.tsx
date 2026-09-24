import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { StructuredData } from "@/components/structured-data";
import { TrackPageView } from "@/components/track-page-view";
import { buttonVariants } from "@/components/ui/button";
import { getPublicDestinations } from "@/lib/destinations";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { publicPage } from "@/lib/public-paths";
import { cn } from "cn";

const homeDescription = "Poza Nutą organizuje karaoke i wydarzenia muzyczne w Trójmieście. Poznaj nas, sprawdź informacje dla uczestników i lokali oraz skontaktuj się z nami.";
export const metadata: Metadata = publicMetadata(publicPage.home, "Poza Nutą — karaoke i wydarzenia muzyczne w Trójmieście", homeDescription);

const textLink = "inline-flex min-h-11 items-center gap-2 text-base font-bold text-foreground underline decoration-accent underline-offset-4 transition-colors hover:text-accent";

export default async function HomePage() {
  const destinations = await getPublicDestinations();
  const leadDestination = destinations[0];

  return (
    <>
      <TrackPageView />
      <StructuredData data={publicPageGraph(publicPage.home, "Poza Nutą", homeDescription, { includeOrganization: true, destinations })} />
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        <section className="grid gap-12 border-b py-20 sm:py-28 lg:min-h-[39rem] lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:items-end lg:gap-16 lg:py-28" aria-labelledby="hero-title">
          <div>
            <h1 id="hero-title" className="font-display max-w-[11ch] text-[clamp(3.65rem,9vw,6rem)] leading-[0.93] tracking-[-0.025em] text-foreground">Nie musisz umieć śpiewać. <span className="text-accent">Musisz chcieć śpiewać.</span></h1>
          </div>
          <div className="max-w-md lg:pb-2">
            <p className="text-xl font-bold leading-snug">Karaoke i wydarzenia muzyczne w Trójmieście.</p>
            <p className="mt-5 text-base leading-7 text-muted-foreground">Poza Nutą zaprasza do wspólnego śpiewania. Sprawdź, gdzie publikujemy aktualne daty i miejsca.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link href={publicPage.karaoke} className={cn(buttonVariants({ variant: "accent", size: "lg" }), "min-w-0 justify-between whitespace-normal")}>Chcę zaśpiewać <ArrowRight aria-hidden="true" /></Link>
              <Link href={publicPage.venues} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-w-0 justify-between whitespace-normal")}>Dla lokali <ArrowRight aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <div className="border-b py-5" aria-hidden="true">
          <p className="font-display text-center text-[clamp(2rem,5vw,3.5rem)] leading-none tracking-wide text-accent">KARAOKE · MUZYKA · TRÓJMIASTO · POZA NUTĄ</p>
        </div>

        <section className="grid gap-8 border-b py-20 sm:py-28 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] lg:gap-20" aria-labelledby="idea-heading">
          <h2 id="idea-heading" className="font-display max-w-[10ch] text-5xl leading-[0.9] sm:text-6xl">Śpiewaj po swojemu.</h2>
          <div className="max-w-2xl lg:pt-1">
            <p className="text-xl font-bold leading-8 sm:text-2xl sm:leading-9">Karaoke to wspólny czas przy muzyce, nie konkurs wokalny.</p>
            <p className="mt-5 text-base leading-7 text-muted-foreground">Nie potrzebujesz perfekcyjnego wykonania, żeby dołączyć. Aktualne informacje o karaoke Poza Nutą znajdziesz w naszych oficjalnych kanałach.</p>
          </div>
        </section>

        <section className="border-b py-20 sm:py-28" aria-labelledby="paths-heading">
          <h2 id="paths-heading" className="font-display text-5xl leading-[0.9] sm:text-6xl">Znajdź swoją drogę</h2>
          <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-16">
            <div className="border-t border-accent pt-7">
              <h3 className="font-display text-4xl leading-none sm:text-5xl">Chcę śpiewać</h3>
              <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">Dowiedz się, gdzie sprawdzać bieżące daty i miejsca karaoke w Trójmieście.</p>
              <Link href={publicPage.karaoke} className={cn(textLink, "mt-6")}>Karaoke w Trójmieście <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
            <div className="border-t border-foreground pt-7">
              <h3 className="font-display text-4xl leading-none sm:text-5xl">Prowadzę lokal</h3>
              <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">Porozmawiajmy o karaoke lub wydarzeniu muzycznym w Twoim lokalu.</p>
              <Link href={publicPage.venues} className={cn(textLink, "mt-6")}>Współpraca z lokalami <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section className="grid gap-10 border-b py-20 sm:py-28 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)] lg:gap-20" aria-labelledby="how-heading">
          <h2 id="how-heading" className="font-display max-w-[10ch] text-5xl leading-[0.9] sm:text-6xl">Jak dołączyć?</h2>
          <ol className="divide-y border-y">
            <li className="grid grid-cols-[2rem_1fr] gap-5 py-6"><span className="font-display text-2xl text-accent">1</span><div><h3 className="font-bold">Sprawdź aktualności</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Daty i miejsca publikujemy w oficjalnych kanałach.</p></div></li>
            <li className="grid grid-cols-[2rem_1fr] gap-5 py-6"><span className="font-display text-2xl text-accent">2</span><div><h3 className="font-bold">Wybierz okazję</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Znajdź termin, który Ci pasuje.</p></div></li>
            <li className="grid grid-cols-[2rem_1fr] gap-5 py-6"><span className="font-display text-2xl text-accent">3</span><div><h3 className="font-bold">Przyjdź po muzykę</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Śpiewaj i spędź czas z innymi.</p></div></li>
          </ol>
        </section>

        <section className="flex flex-col gap-8 border-b py-20 sm:flex-row sm:items-end sm:justify-between sm:gap-12 sm:py-28" aria-labelledby="channels-heading">
          <div className="max-w-xl">
            <h2 id="channels-heading" className="font-display text-5xl leading-[0.9] sm:text-6xl">Bądź blisko muzyki</h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">Obserwuj oficjalne kanały Poza Nutą, żeby nie przegapić bieżących informacji.</p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 text-sm font-bold">
            {leadDestination ? <Link href={`/go/${encodeURIComponent(leadDestination.slug)}`} target="_blank" rel="noopener noreferrer" className={textLink}>Otwórz {leadDestination.label} <ArrowUpRight className="size-4" aria-hidden="true" /></Link> : null}
            <Link href={publicPage.links} className={textLink}>Wszystkie oficjalne linki <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="flex flex-col items-start gap-8 py-20 sm:py-28 lg:flex-row lg:items-end lg:justify-between" aria-labelledby="final-heading">
          <div>
            <h2 id="final-heading" className="font-display max-w-[12ch] text-[clamp(3.6rem,8vw,6rem)] leading-[0.9] tracking-[-0.025em]">Do zobaczenia przy mikrofonie.</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">Zobacz informacje dla uczestników i sprawdź aktualne kanały Poza Nutą.</p>
          </div>
          <Link href={publicPage.karaoke} className={cn(buttonVariants({ variant: "accent", size: "lg" }), "justify-between")}>Chcę zaśpiewać <ArrowRight aria-hidden="true" /></Link>
        </section>
      </main>
    </>
  );
}
