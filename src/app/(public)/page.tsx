import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { StructuredData } from "@/components/structured-data";
import { buttonVariants } from "@/components/ui/button";
import { getPublicDestinations } from "@/lib/destinations";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { publicPage } from "@/lib/public-paths";
import { cn } from "cn";

const homeDescription = "Poza Nutą organizuje karaoke i wydarzenia muzyczne w Trójmieście. Poznaj nas, sprawdź informacje dla uczestników i lokali oraz skontaktuj się z nami.";
export const metadata: Metadata = publicMetadata(publicPage.home, "Poza Nutą — karaoke i wydarzenia muzyczne w Trójmieście", homeDescription);

const container = "mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12";
const editorialLink = "inline-flex min-h-11 items-center gap-2 font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-accent";
const primaryAction = cn(buttonVariants({ variant: "accent", size: "xl" }), "min-w-0 justify-between rounded-none px-6 text-left sm:min-w-64");

export default async function HomePage() {
  const destinations = await getPublicDestinations();
  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.home, "Poza Nutą", homeDescription, { includeOrganization: true, destinations })} />
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        <section aria-labelledby="hero-title" className="overflow-hidden border-b border-border">
          <div className={container}>
            <h1 id="hero-title" className="font-display whitespace-nowrap pb-1 pt-4 text-center text-[clamp(4.4rem,20.8vw,14rem)] uppercase leading-[0.76] tracking-[-0.025em] text-accent sm:pt-9 md:pt-6 md:text-[clamp(4.4rem,18.5vw,14rem)]"><span>Poza</span>{" "}<span>Nutą</span></h1>
            <div className="mt-3 flex items-center justify-between gap-4 border-y border-border py-3 text-xs font-bold uppercase tracking-[0.12em] sm:mt-5 sm:tracking-[0.15em]">
              <span>Karaoke i wydarzenia muzyczne</span><span>Trójmiasto</span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-x-4 gap-y-3 pb-12 pt-1 min-[380px]:grid-cols-[minmax(0,1fr)_9.5rem] sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-x-8 sm:gap-y-6 sm:pt-7 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:gap-10 md:pb-16 lg:gap-16">
              <div className="contents md:flex md:flex-col md:items-start">
                <div className="col-start-1 row-start-1 min-w-0 md:col-auto md:row-auto">
                  <h2 className="font-display text-[3rem] leading-[0.85] sm:text-[clamp(3.5rem,9vw,6.25rem)] md:max-w-[8ch]">Przyjdź <span className="block">dla muzyki.</span></h2>
                  <p className="mt-4 max-w-md text-base font-medium leading-7 sm:mt-5 sm:text-lg">Przyjdź posłuchać, spędzić czas z innymi albo zaśpiewać.</p>
                </div>
                <div className="col-span-2 row-start-2 flex w-full flex-col items-start gap-2 md:col-auto md:row-auto md:mt-6">
                  <Link href={publicPage.karaoke} className={cn(primaryAction, "w-full sm:w-auto")}>Informacje o karaoke <ArrowUpRight aria-hidden="true" /></Link>
                  <Link href={publicPage.links} className={editorialLink}>Daty w oficjalnych kanałach <ArrowRight className="size-4" aria-hidden="true" /></Link>
                </div>
              </div>
              <figure className="col-start-2 row-start-1 w-[9.5rem] min-w-0 justify-self-end md:col-auto md:row-auto md:w-auto">
                <div className="border border-border bg-card p-1 sm:p-2 md:p-3">
                  <Image src="/media/events/2026-08-16-igranie/experience-group-poster.webp" alt="Dwie osoby śpiewają razem podczas wieczoru Poza Nutą." width={720} height={1280} sizes="(max-width: 639px) 128px, (max-width: 767px) 160px, (max-width: 1279px) 45vw, 36vw" loading="eager" fetchPriority="high" className="h-[12rem] w-full object-cover object-[center_30%] sm:h-[16rem] md:h-[35rem] lg:h-[39rem]" />
                </div>
                <figcaption className="mt-2 max-w-md text-xs font-bold uppercase leading-4 tracking-[0.08em] text-muted-foreground md:mt-3 md:leading-5 md:tracking-[0.13em]">iGranie w Lochu · 16.08.2026</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section aria-labelledby="belonging-heading" className="bg-accent text-accent-foreground">
          <div className={cn(container, "grid gap-10 py-16 md:grid-cols-[minmax(0,1.15fr)_minmax(15rem,0.7fr)] md:items-center md:gap-16 md:py-20")}>
            <div>
              <p className="border-b border-black/35 pb-3 text-xs font-bold uppercase tracking-[0.16em]">Druga strona tego samego wieczoru</p>
              <h2 id="belonging-heading" className="font-display mt-7 max-w-[9ch] text-[clamp(4.5rem,10vw,9rem)] leading-[0.85]">Możesz po prostu być.</h2>
              <p className="mt-6 max-w-lg text-xl font-bold leading-snug sm:text-2xl">Nie musisz występować, żeby uczestniczyć w wieczorze.</p>
            </div>
            <figure className="w-full max-w-[20rem] justify-self-end">
              <Image src="/media/events/2026-08-16-igranie/experience-social.webp" alt="Uczestniczki spędzają czas przy stoliku podczas wieczoru Poza Nutą." width={720} height={1280} sizes="(max-width: 640px) 320px, 352px" loading="lazy" fetchPriority="low" className="h-auto w-full" />
              <figcaption className="mt-3 border-t border-black/35 pt-3 text-xs font-bold uppercase leading-5 tracking-[0.13em]">Ten sam wieczór · iGranie w Lochu</figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="participation-heading" className="border-b border-border">
          <div className={cn(container, "py-20 md:py-28")}>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] lg:gap-20">
              <div>
                <p className="border-b border-border pb-3 text-xs font-bold uppercase tracking-[0.16em] text-accent">Dla chętnych do mikrofonu</p>
                <h2 id="participation-heading" className="font-display mt-7 max-w-[10ch] text-[clamp(3.8rem,6vw,6.5rem)] leading-[0.88]">Od wejścia do występu.</h2>
              </div>
              <div>
                <ol className="border-t border-accent">
                  {[
                    ["01", "Przyjdź", "Nie rezerwujesz występu przez Poza Nutą przed przyjściem."],
                    ["02", "Zgłoś utwór", "Na miejscu zeskanuj QR, wpisz sześciocyfrowy kod sesji i wybierz lub dodaj piosenkę."],
                    ["03", "Poczekaj na wywołanie", "Utwór trafia do kolejki. Kiedy nadejdzie Twoja kolej, możesz zaśpiewać."],
                  ].map(([number, heading, body]) => (
                    <li key={number} className="grid gap-3 border-b border-border py-6 sm:grid-cols-[3rem_minmax(0,0.6fr)_minmax(0,1fr)] sm:gap-5">
                      <span className="text-xs font-bold tracking-[0.15em] text-accent">{number}</span>
                      <h3 className="text-xl font-bold tracking-tight">{heading}</h3>
                      <p className="max-w-md text-sm leading-6 text-muted-foreground">{body}</p>
                    </li>
                  ))}
                </ol>
                <Link href={publicPage.karaoke} className={cn(editorialLink, "mt-5")}>Udział krok po kroku <ArrowRight className="size-4" aria-hidden="true" /></Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="field-note-heading" className="bg-foreground text-background">
          <div className={cn(container, "py-16 md:py-24")}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-background/40 py-3 text-xs font-bold uppercase tracking-[0.16em]">
              <span>Zapis wieczoru / archiwum</span><span>Gdynia · 16.08.2026</span>
            </div>
            <div className="grid gap-10 pt-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-end md:gap-16 lg:gap-24">
              <figure className="w-full max-w-[30rem] md:order-1">
                <Image src="/media/events/2026-08-16-igranie/igranie-case-study.webp" alt="Uczestniczka śpiewa w lokalu iGranie w Lochu; widać ekran i nagłośnienie." width={720} height={1280} sizes="(max-width: 767px) calc(100vw - 40px), 38vw" loading="lazy" className="aspect-[4/5] w-full object-cover object-[center_34%]" />
                <figcaption className="mt-3 border-t border-background/40 pt-3 text-xs font-bold uppercase leading-5 tracking-[0.12em]">Kadr z wydarzenia · iGranie w Lochu</figcaption>
              </figure>
              <div className="md:order-2 md:pb-5">
                <p className="font-display text-[clamp(5rem,12vw,12rem)] leading-[0.78]" aria-label="16 sierpnia">16 / 08</p>
                <h2 id="field-note-heading" className="font-display mt-8 max-w-[10ch] text-[clamp(4.2rem,8vw,8rem)] leading-[0.85]">iGranie<br />w Lochu.</h2>
                <p className="mt-7 max-w-[32ch] text-xl font-bold leading-snug sm:text-2xl">Poza Nutą prowadzi w tym gdyńskim lokalu cykliczne wieczory karaoke.</p>
                <p className="mt-4 max-w-md text-base leading-7">Ten kadr pochodzi z wydarzenia 16 sierpnia 2026 r.</p>
              </div>
            </div>
            <div className="mt-14 grid gap-6 border-t border-background/40 pt-7 md:mt-20 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-16 lg:gap-24">
              <p className="font-display text-[clamp(3.5rem,5vw,6rem)] leading-[0.87]">Co teraz?</p>
              <div>
                <p className="max-w-xl text-lg font-bold leading-snug sm:text-xl">Daty i miejsca ogłaszamy w oficjalnych kanałach Poza Nutą.</p>
                <p className="mt-2 text-sm leading-6">Sprawdź najnowszy komunikat przed wyjściem.</p>
                <Link href={publicPage.links} className={cn(primaryAction, "mt-5 w-full sm:w-auto")}>Daty w oficjalnych kanałach <ArrowUpRight aria-hidden="true" /></Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="venue-heading" className="border-b border-border">
          <div className={cn(container, "grid gap-8 py-20 md:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] md:items-end md:gap-20 md:py-24")}>
            <div>
              <p className="border-b border-border pb-3 text-xs font-bold uppercase tracking-[0.16em] text-accent">Osobna droga dla lokalu</p>
              <h2 id="venue-heading" className="font-display mt-7 max-w-[10ch] text-[clamp(3.7rem,7vw,7rem)] leading-[0.88]">Muzyka w Twoim lokalu?</h2>
            </div>
            <div>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">Poza Nutą prowadzi cykliczne wieczory karaoke w iGranie w Lochu w Gdyni. Zakres każdej współpracy ustalamy z lokalem osobno.</p>
              <Link href={publicPage.venues} className={cn(editorialLink, "mt-5")}>Współpraca z lokalami <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="closing-heading" className="border-t border-accent">
          <div className={cn(container, "py-20 md:py-28")}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Poza Nutą / Trójmiasto</p>
            <h2 id="closing-heading" className="font-display mt-6 max-w-[13ch] text-[clamp(3.8rem,10vw,9.5rem)] leading-[0.82]"><span className="text-accent">Do zobaczenia</span><br /> przy muzyce.</h2>
            <div className="mt-10 flex flex-col items-start gap-5 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-lg text-base leading-7 text-muted-foreground">Sprawdź, jak wygląda udział w karaoke Poza Nutą.</p>
              <Link href={publicPage.karaoke} className={cn(primaryAction, "w-full sm:w-auto")}>Informacje o karaoke <ArrowUpRight aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
