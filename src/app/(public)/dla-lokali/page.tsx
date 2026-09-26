import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { StructuredData } from "@/components/structured-data";
import { buttonVariants } from "@/components/ui/button";
import { publicPage } from "@/lib/public-paths";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { cn } from "cn";

const title = "Współpraca z lokalami";
const description = "Poza Nutą współpracuje z lokalami w Trójmieście przy karaoke i wydarzeniach muzycznych. Zobacz rzeczywistą realizację w iGranie w Lochu i porozmawiaj o swoim miejscu.";

export const metadata: Metadata = publicMetadata(publicPage.venues, title, description);

const contactLinkClass = cn(
  buttonVariants({ variant: "accent", size: "xl" }),
  "min-w-0 w-full justify-between gap-8 whitespace-normal rounded-none px-6 text-left sm:w-auto sm:min-w-72 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
);

export default function VenuesPage() {
  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.venues, title, description)} />
      <main id="main-content" tabIndex={-1} className="w-full flex-1">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <PublicBreadcrumb current={title} />
        </div>

        <article>
          <header className="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:px-12 lg:pb-24">
            <div className="flex items-center justify-between gap-4 border-t border-border pt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <span>Poza Nutą / współpraca</span>
              <span>Trójmiasto</span>
            </div>
            <div className="mt-6 grid gap-4 sm:mt-12 sm:gap-8 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:items-center lg:gap-16">
              <div className="min-w-0">
                <h1 className="font-display max-w-[11ch] text-[clamp(4rem,9vw,7rem)] leading-[0.86] tracking-[-0.025em] text-foreground">
                  Muzyka w<br />Twoim <span className="text-accent">lokalu.</span>
                </h1>
                <p className="mt-8 max-w-md text-xl font-bold leading-snug sm:text-2xl">
                  Karaoke i wydarzenia muzyczne tworzone z lokalami w Trójmieście.
                </p>
                <Link href={publicPage.contact} className={cn(contactLinkClass, "mt-6")}>
                  Porozmawiajmy o współpracy
                  <ArrowUpRight aria-hidden="true" className="size-5" />
                </Link>
              </div>
              <figure className="min-w-0 lg:justify-self-end">
                <Image
                  src="/media/events/2026-08-16-igranie/igranie-case-study.webp"
                  alt="Uczestniczka śpiewa w lokalu iGranie w Lochu; widać ekran i nagłośnienie."
                  width={720}
                  height={1280}
                  sizes="(max-width: 1023px) calc(100vw - 40px), 38vw"
                  loading="eager"
                  className="aspect-[4/3] w-full object-cover object-[center_32%] lg:aspect-[4/5] lg:max-h-[36rem]"
                />
                <figcaption className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-border pt-3 text-xs font-bold uppercase leading-5 tracking-[0.1em] text-muted-foreground">
                  <span>Wieczór Poza Nutą</span>
                  <span>iGranie w Lochu · Gdynia · 16.08.2026</span>
                </figcaption>
              </figure>
            </div>
          </header>

          <section aria-labelledby="case-heading" className="border-y border-background/30 bg-foreground text-background">
            <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
              <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-background/30 pt-4 text-xs font-bold uppercase tracking-[0.14em]">
                <span>Realizacja / iGranie w Lochu</span>
                <span>Gdynia · 16.08.2026</span>
              </div>

              <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
                <div>
                  <h2 id="case-heading" className="font-display max-w-[10ch] text-[clamp(3.5rem,7vw,6rem)] leading-[0.88] tracking-[-0.02em]">
                    iGranie<br />w Lochu.
                  </h2>
                  <p className="mt-7 max-w-xl text-xl font-bold leading-snug sm:text-2xl">
                    W tym gdyńskim lokalu Poza Nutą prowadzi cykliczne wieczory karaoke.
                  </p>
                  <p className="mt-4 max-w-xl text-base leading-7 text-background/75">
                    Ustalamy wspólnie format wieczoru, sposób prowadzenia i odpowiedzialność każdej strony. Dla innego miejsca zaczynamy od rozmowy.
                  </p>
                </div>
                <div className="border-t border-background/30 lg:self-end">
                    <div className="grid gap-3 border-b border-background/30 py-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-8 sm:py-6">
                      <h3 className="text-base font-bold">Poza Nutą</h3>
                      <p className="max-w-lg text-base leading-7 text-background/75">
                        Prowadzenie wieczoru, obsługa zgłoszeń utworów i kolejki występów.
                      </p>
                    </div>
                    <div className="grid gap-3 border-b border-background/30 py-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-8 sm:py-6">
                      <h3 className="text-base font-bold">Lokal</h3>
                      <p className="max-w-lg text-base leading-7 text-background/75">
                        Nagłośnienie, mikrofony i projektory w tej realizacji.
                      </p>
                    </div>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="scope-heading" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
            <div className="grid gap-10 border-t border-border pt-8 lg:grid-cols-12 lg:gap-x-6">
              <h2 id="scope-heading" className="font-display max-w-[11ch] text-[clamp(3.5rem,6vw,5.5rem)] leading-[0.9] tracking-[-0.02em] lg:col-span-5">
                Każde miejsce ma własny rytm.
              </h2>
              <div className="lg:col-span-6 lg:col-start-7">
                <p className="max-w-xl text-xl font-bold leading-snug sm:text-2xl">
                  Zakres współpracy ustalamy indywidualnie z lokalem.
                </p>
                <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                  Rozmawiamy o przestrzeni, charakterze wydarzenia, prowadzeniu, komunikacji i zapleczu technicznym. Dopiero wtedy ustalamy, co leży po której stronie.
                </p>
                <div className="mt-9 border-t border-border">
                  <p className="border-b border-border py-5 text-base leading-7">
                    Poza Nutą może zająć się prowadzeniem karaoke, zgłoszeniami i kolejką występów.
                  </p>
                  <p className="border-b border-border py-5 text-base leading-7">
                    Promocję, dodatkowy sprzęt lub dokumentację foto i wideo omawiamy osobno, jeśli są potrzebne w danym wydarzeniu.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="contact-heading" className="border-t border-border">
            <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-12 lg:items-end lg:gap-x-6 lg:px-12 lg:py-24">
              <div className="lg:col-span-8">
                <h2 id="contact-heading" className="font-display max-w-[12ch] text-[clamp(3.5rem,7vw,6rem)] leading-[0.89] tracking-[-0.02em]">
                  Opowiedz nam o swoim miejscu.
                </h2>
                <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
                  Napisz, gdzie działa Twój lokal i jaki wieczór masz na myśli. Możesz zacząć od samego pomysłu.
                </p>
              </div>
              <Link href={publicPage.contact} className={cn(contactLinkClass, "lg:col-span-4 lg:justify-self-end")}>
                Kontakt / współpraca
                <ArrowUpRight aria-hidden="true" className="size-5" />
              </Link>
            </div>
          </section>
        </article>
      </main>
    </>
  );
}
