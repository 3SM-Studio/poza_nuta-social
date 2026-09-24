import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { PublicPageMain } from "@/components/public-page-main";
import { StructuredData } from "@/components/structured-data";
import { buttonVariants } from "@/components/ui/button";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { publicPage } from "@/lib/public-paths";

const title = "Współpraca z lokalami";
const description = "Poza Nutą współpracuje z lokalami w Trójmieście przy karaoke i wydarzeniach muzycznych. Sprawdź, jak nawiązać kontakt i opisać propozycję.";
export const metadata: Metadata = publicMetadata(publicPage.venues, title, description);

export default function VenuesPage() {
  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.venues, title, description)} />
      <PublicPageMain>
      <PublicBreadcrumb current={title} />
      <article className="flex-1 py-10 sm:py-14">
        <h1 className="font-display text-[clamp(3.4rem,12vw,5.5rem)] leading-[0.9] tracking-[-0.025em] text-foreground">Współpraca z lokalami</h1>
        <p className="mt-7 text-lg font-bold leading-7 text-foreground">Poza Nutą współpracuje z lokalami w Trójmieście przy karaoke i wydarzeniach muzycznych.</p>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">Masz lokal w Trójmieście i rozważasz karaoke albo inne wydarzenie muzyczne z Poza Nutą? Opisz swój pomysł przez stronę kontaktową. Możesz zacząć od wstępnej propozycji — nie musisz mieć gotowego harmonogramu.</p>

        <section className="mt-12 border-t pt-8" aria-labelledby="message-heading">
          <h2 id="message-heading" className="text-xl font-bold tracking-tight">Co napisać w pierwszej wiadomości?</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Podaj nazwę i lokalizację lokalu, opisz pomysł na karaoke lub wydarzenie muzyczne oraz proponowany termin, jeśli już go znasz. To pomoże nam odnieść się do Twojej propozycji.</p>
          <Link href={publicPage.contact} className={`${buttonVariants({ variant: "accent", size: "lg" })} mt-6 w-full justify-between sm:w-auto`}>
            Kontakt / współpraca <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>

        <section className="mt-12 border-t pt-8" aria-labelledby="about-karaoke-heading">
          <h2 id="about-karaoke-heading" className="text-xl font-bold tracking-tight">Karaoke Poza Nutą</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Chcesz najpierw sprawdzić, czym zajmuje się Poza Nutą i gdzie znaleźć aktualne informacje? Zobacz stronę o karaoke oraz nasze oficjalne profile.</p>
          <Link href={publicPage.karaoke} className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-6 w-full justify-between sm:w-auto`}>
            O karaoke w Trójmieście <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </article>
      </PublicPageMain>
    </>
  );
}
