import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { SocialHub } from "@/components/social-hub";
import { StructuredData } from "@/components/structured-data";
import { getPublicDestinations } from "@/lib/destinations";
import { publicPage } from "@/lib/public-paths";
import { publicMetadata, publicPageGraph } from "@/lib/seo";

const title = "Oficjalne linki";
const description = "Oficjalne kanały Poza Nutą oraz kontakt. Karaoke i wydarzenia muzyczne w Trójmieście.";
export const metadata: Metadata = publicMetadata(publicPage.links, title, description);

export default async function LinksPage() {
  const destinations = await getPublicDestinations();
  const soleChannel = destinations.length === 1 ? destinations[0] : null;

  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.links, title, description)} />
      <main id="main-content" tabIndex={-1} className="w-full flex-1 px-5 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-[640px]">
          <PublicBreadcrumb current={title} />

          <section className="pb-20 pt-11 sm:pb-28 sm:pt-16" aria-labelledby="links-heading">
            <h1 id="links-heading" className="font-display text-[clamp(3.5rem,14vw,6.5rem)] leading-[0.87] tracking-[-0.025em]">
              Oficjalne <br />kanały<span className="text-accent">.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
              Poza Nutą w Trójmieście. {soleChannel ? `Obecnie aktywny kanał: ${soleChannel.label}. Tam sprawdź komunikat o dacie i miejscu przed wyjściem.` : "Tutaj znajdziesz nasze oficjalne kanały. Sprawdź komunikat o dacie i miejscu przed wyjściem."}
            </p>

            <div className="mt-10 border-t border-border">
              {destinations.length ? (
                <SocialHub destinations={destinations} />
              ) : (
                <p className="py-6 text-sm leading-6 text-muted-foreground">Oficjalne kanały są właśnie konfigurowane. W sprawie kontaktu napisz do nas.</p>
              )}
            </div>

            <Link
              href={publicPage.contact}
              className="group flex min-h-20 items-center justify-between gap-4 border-b border-border py-4 text-left text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="min-w-0">
                <span className="block text-lg font-semibold">Kontakt / współpraca</span>
                <span className="mt-1 block text-sm text-muted-foreground">Pytania i propozycje współpracy</span>
              </span>
              <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
