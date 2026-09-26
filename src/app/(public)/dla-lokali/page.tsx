import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { PublicPageMain } from "@/components/public-page-main";
import { StructuredData } from "@/components/structured-data";
import { buttonVariants } from "@/components/ui/button";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { publicPage } from "@/lib/public-paths";

const title = "Współpraca z lokalami";
const description = "Poza Nutą współpracuje z lokalami w Trójmieście przy karaoke i wydarzeniach muzycznych. Poznaj możliwy zakres współpracy i rzeczywistą realizację w iGranie w Lochu.";
export const metadata: Metadata = publicMetadata(publicPage.venues, title, description);

export default function VenuesPage() {
  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.venues, title, description)} />
      <PublicPageMain className="max-w-4xl">
      <PublicBreadcrumb current={title} />
      <article className="flex-1 pb-20 pt-10 sm:pb-28 sm:pt-14">
        <div className="border-t border-accent pt-6">
          <h1 className="font-display max-w-[12ch] text-[clamp(3.4rem,12vw,5.5rem)] leading-[0.9] tracking-[-0.025em] text-foreground">Współpraca z lokalami</h1>
          <p className="mt-8 max-w-xl text-xl font-bold leading-snug sm:text-2xl">Karaoke i wydarzenia muzyczne dopasowane do Twojego lokalu.</p>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Poza Nutą współpracuje z lokalami w Trójmieście. Ustalamy razem format wydarzenia, sposób prowadzenia i zakres pracy po obu stronach.</p>
          <Link href={publicPage.contact} className={`${buttonVariants({ variant: "accent", size: "xl" })} mt-8 w-full justify-between whitespace-normal sm:w-auto`}>
            Porozmawiajmy o współpracy <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <section className="mt-16 border-t pt-8 sm:mt-20" aria-labelledby="scope-heading">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">Możliwy zakres</p>
          <h2 id="scope-heading" className="font-display mt-3 text-4xl leading-none sm:text-5xl">Co możemy wziąć na siebie?</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Dobieramy działania do wydarzenia i możliwości lokalu. Poniższe obszary są punktem rozmowy, a nie stałym pakietem każdej współpracy.</p>
          <div className="mt-8 border-t border-accent">
            <div className="grid gap-2 border-b py-6 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8">
              <h3 className="text-lg font-bold">Przebieg wieczoru</h3>
              <p className="text-base leading-7 text-muted-foreground">Koordynacja i prowadzenie karaoke, obsługa zgłoszeń utworów oraz kolejki występów.</p>
            </div>
            <div className="grid gap-2 border-b py-6 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8">
              <h3 className="text-lg font-bold">Komunikacja</h3>
              <p className="text-base leading-7 text-muted-foreground">Materiały promocyjne i informowanie o wydarzeniu w kanałach społecznościowych; w uzgodnionym zakresie także reklama płatna.</p>
            </div>
            <div className="grid gap-2 border-b py-6 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8">
              <h3 className="text-lg font-bold">Wsparcie na miejscu</h3>
              <p className="text-base leading-7 text-muted-foreground">Dodatkowy sprzęt, a gdy ma to sens dla wydarzenia i uzgodnimy warunki — dokumentacja foto lub wideo.</p>
            </div>
          </div>
        </section>

        <section className="mt-16 border-t pt-8 sm:mt-20" aria-labelledby="conditions-heading">
          <h2 id="conditions-heading" className="font-display text-4xl leading-none sm:text-5xl">Ustalamy podział zadań.</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Przed wydarzeniem sprawdzamy przestrzeń, dostępne nagłośnienie i sprzęt, plan promocji oraz odpowiedzialność każdej strony. Podział techniczny zależy od lokalu; nie zakładamy jednego modelu dla wszystkich miejsc.</p>
        </section>

        <section className="mt-16 border-t pt-8 sm:mt-20" aria-labelledby="case-heading">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.55fr)] lg:items-start lg:gap-14">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">Rzeczywista współpraca</p>
              <h2 id="case-heading" className="font-display mt-3 text-4xl leading-none sm:text-5xl">iGranie w Lochu, Gdynia</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Poza Nutą współpracuje z iGranie w Lochu przy wydarzeniach karaoke. W tej realizacji lokal zapewnia nagłośnienie, mikrofony i projektory. Poza Nutą prowadzi wieczór, obsługuje zgłoszenia utworów i kolejkę oraz może uzupełnić wyposażenie własnym sprzętem.</p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">To przykład podziału pracy w jednym miejscu. Warunki dla Twojego lokalu ustalimy osobno.</p>
            </div>
            <figure className="w-full max-w-[22rem]">
              <Image src="/media/events/2026-08-16-igranie/igranie-case-study.webp" alt="Uczestniczka śpiewa w lokalu iGranie w Lochu; widać ekran i nagłośnienie." width={720} height={1280} sizes="(max-width: 1024px) 100vw, 28vw" className="h-auto w-full" loading="lazy" />
              <figcaption className="mt-3 border-t pt-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Realizacja Poza Nutą · 16.08.2026</figcaption>
            </figure>
          </div>
        </section>

        <section className="mt-16 border-t pt-8 sm:mt-20" aria-labelledby="message-heading">
          <h2 id="message-heading" className="font-display text-4xl leading-none sm:text-5xl">Zacznijmy od rozmowy.</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Napisz, gdzie działa Twój lokal i jaki rodzaj wydarzenia rozważasz. Jeśli masz termin lub informacje o przestrzeni i sprzęcie, dołącz je. Możesz też zacząć od samego pomysłu.</p>
          <Link href={publicPage.contact} className={`${buttonVariants({ variant: "accent", size: "xl" })} mt-7 w-full justify-between whitespace-normal sm:w-auto`}>
            Kontakt / współpraca <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </article>
      </PublicPageMain>
    </>
  );
}
