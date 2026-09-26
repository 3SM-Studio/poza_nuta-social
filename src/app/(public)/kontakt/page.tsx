import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { TrackedContactLink } from "@/components/tracked-contact-link";
import { StructuredData } from "@/components/structured-data";
import { getContactEmail } from "@/lib/env";
import { publicPage } from "@/lib/public-paths";
import { publicMetadata, publicPageGraph } from "@/lib/seo";

const description = "Skontaktuj się z Poza Nutą w sprawie karaoke, wydarzeń muzycznych lub współpracy z lokalem w Trójmieście.";
export const metadata: Metadata = publicMetadata(publicPage.contact, "Kontakt i współpraca", description);

const textLink = "group inline-flex min-h-11 items-center gap-2 font-semibold text-foreground underline decoration-accent underline-offset-4 transition-colors hover:text-accent focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default function ContactPage() {
  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.contact, "Kontakt / współpraca", description)} />
      <main id="main-content" tabIndex={-1} className="w-full flex-1 px-5 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-[1200px]">
          <PublicBreadcrumb current="Kontakt / współpraca" />

          <section className="pb-20 pt-12 sm:pb-28 sm:pt-20" aria-labelledby="contact-heading">
            <div className="grid items-end gap-8 border-b border-border pb-11 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:gap-16 lg:pb-16">
              <div>
                <h1 id="contact-heading" className="font-display text-[clamp(4.75rem,12vw,10.5rem)] leading-[0.82] tracking-[-0.025em]">
                  Kontakt<span className="text-accent">.</span>
                </h1>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Poza Nutą / Trójmiasto</p>
              </div>
              <p className="max-w-md text-xl leading-snug sm:text-2xl">
                Masz pytanie o karaoke albo pomysł na wspólne wydarzenie? Napisz do nas.
              </p>
            </div>

            <div className="pt-8 sm:pt-12">
              <p className="text-sm font-semibold text-muted-foreground">Najprościej tutaj</p>
              <TrackedContactLink email={getContactEmail()} />
            </div>

            <div className="mt-14 grid gap-10 border-t border-border pt-8 sm:mt-20 sm:grid-cols-2 sm:gap-14 sm:pt-10">
              <section aria-labelledby="venue-heading">
                <h2 id="venue-heading" className="text-2xl font-semibold tracking-tight">Reprezentujesz lokal?</h2>
                <p className="mt-3 max-w-md leading-7 text-muted-foreground">
                  W wiadomości podaj nazwę lokalu, miasto i pomysł na wydarzenie. Termin i zakres współpracy ustalimy w rozmowie.
                </p>
                <Link href={publicPage.venues} className={`${textLink} mt-4`}>
                  Zobacz informacje dla lokali <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </section>
              <section aria-labelledby="dates-heading">
                <h2 id="dates-heading" className="text-2xl font-semibold tracking-tight">Szukasz daty lub miejsca?</h2>
                <p className="mt-3 max-w-md leading-7 text-muted-foreground">
                  Aktualne informacje o karaoke i wydarzeniach podajemy w oficjalnych kanałach. Sprawdź najnowszy komunikat przed wyjściem.
                </p>
                <Link href={publicPage.links} className={`${textLink} mt-4`}>
                  Przejdź do oficjalnych kanałów <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </section>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
