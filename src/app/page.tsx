import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { StructuredData } from "@/components/structured-data";
import { TrackPageView } from "@/components/track-page-view";
import { buttonVariants } from "@/components/ui/button";
import { getPublicDestinations } from "@/lib/destinations";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { cn } from "cn";

export const revalidate = 60;
const homeDescription = "Poza Nutą organizuje karaoke i wydarzenia muzyczne w Trójmieście. Poznaj nas, sprawdź informacje dla uczestników i lokali oraz skontaktuj się z nami.";
export const metadata: Metadata = publicMetadata("/", "Poza Nutą — karaoke i wydarzenia muzyczne w Trójmieście", homeDescription);

export default async function HomePage() {
  const destinations = await getPublicDestinations();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 pt-5 sm:px-8 sm:pt-7 lg:px-10">
      <TrackPageView />
      <StructuredData data={publicPageGraph("/", "Poza Nutą", homeDescription, { includeOrganization: true, destinations })} />
      <PublicHeader />

      <section className="grid flex-1 gap-10 border-b py-16 sm:py-24 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)] lg:items-end lg:gap-20 lg:py-32" aria-labelledby="hero-title">
        <div>
          <h1 id="hero-title" className="font-display max-w-[9ch] text-[clamp(5rem,17vw,11rem)] leading-[0.78] tracking-[-0.025em] text-foreground">
            POZA<br />NUTĄ
          </h1>
          <p className="mt-8 max-w-lg text-xl font-bold leading-snug text-accent sm:text-2xl">
            Karaoke i wydarzenia muzyczne w Trójmieście.
          </p>
        </div>
        <div className="max-w-md lg:pb-2">
          <p className="text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Chcesz zaśpiewać? Sprawdź, gdzie publikujemy aktualne daty i miejsca. Prowadzisz lokal? Porozmawiajmy o karaoke lub wydarzeniu muzycznym.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/karaoke-trojmiasto" className={cn(buttonVariants({ variant: "accent", size: "lg" }), "justify-between whitespace-normal")}>
              Poznaj nasze karaoke <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/dla-lokali" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "justify-between whitespace-normal")}>
              Dla lokali <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-8 border-b py-14 sm:py-20 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-20" aria-labelledby="karaoke-heading">
        <h2 id="karaoke-heading" className="font-display text-5xl leading-[0.9] sm:text-6xl">Przyjdź po muzykę</h2>
        <div className="max-w-2xl">
          <p className="text-lg font-bold leading-7">Karaoke z Poza Nutą to okazja do wspólnego śpiewania w Trójmieście.</p>
          <p className="mt-4 text-base leading-7 text-muted-foreground">Na stronie o karaoke dowiesz się, gdzie szukać aktualnych dat i miejsc. Bieżące informacje publikujemy w naszych oficjalnych kanałach.</p>
          <Link href="/karaoke-trojmiasto" className="mt-6 inline-flex min-h-11 items-center gap-2 font-bold text-foreground underline decoration-accent underline-offset-4 hover:text-accent">
            Karaoke w Trójmieście <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="grid gap-8 border-b py-14 sm:py-20 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-20" aria-labelledby="venues-heading">
        <h2 id="venues-heading" className="font-display text-5xl leading-[0.9] sm:text-6xl">Poza Nutą w Twoim lokalu</h2>
        <div className="max-w-2xl">
          <p className="text-lg font-bold leading-7">Prowadzisz lokal lub organizujesz wydarzenie w Trójmieście?</p>
          <p className="mt-4 text-base leading-7 text-muted-foreground">Porozmawiajmy o karaoke lub innym wydarzeniu muzycznym. Opisz swój pomysł — nie potrzebujesz gotowego harmonogramu, żeby zacząć rozmowę.</p>
          <Link href="/dla-lokali" className="mt-6 inline-flex min-h-11 items-center gap-2 font-bold text-foreground underline decoration-accent underline-offset-4 hover:text-accent">
            Współpraca z lokalami <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-5 py-14 sm:flex-row sm:items-end sm:justify-between sm:gap-12 sm:py-20" aria-labelledby="channels-heading">
        <div className="max-w-xl">
          <h2 id="channels-heading" className="font-display text-4xl leading-[0.9] sm:text-5xl">Bądźmy w kontakcie</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">Aktualne informacje znajdziesz w naszych oficjalnych kanałach. W sprawie współpracy napisz do nas bezpośrednio.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold">
          <Link href="/linki" className="inline-flex min-h-11 items-center gap-2 text-foreground underline decoration-accent underline-offset-4 hover:text-accent">Oficjalne linki <ArrowRight className="size-4" aria-hidden="true" /></Link>
          <Link href="/kontakt" className="inline-flex min-h-11 items-center gap-2 text-foreground underline decoration-accent underline-offset-4 hover:text-accent">Kontakt / współpraca <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
