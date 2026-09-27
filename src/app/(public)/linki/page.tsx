import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { SocialHub } from "@/components/social-hub";
import { StructuredData } from "@/components/structured-data";
import { getPublicDestinations } from "@/lib/destinations";
import { publicPage } from "@/lib/public-paths";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import "../contact-links.css";

const title = "Oficjalne linki";
const description = "Oficjalne kanały Poza Nutą oraz kontakt. Karaoke i wydarzenia muzyczne w Trójmieście.";
export const metadata: Metadata = publicMetadata(publicPage.links, title, description);

export default async function LinksPage() {
  const destinations = await getPublicDestinations();
  const soleChannel = destinations.length === 1 ? destinations[0] : null;

  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.links, title, description)} />
      <main id="main-content" tabIndex={-1} className="ed-page ed-links">
        <div className="ed-links-inner">
          <PublicBreadcrumb current={title} />

          <section className="ed-links-content" aria-labelledby="links-heading">
            <h1 id="links-heading" className="ed-serif ed-links-title">Oficjalne kanały.</h1>
            <p className="ed-links-intro">
              {soleChannel
                ? `Obecnie aktywny kanał: ${soleChannel.label}. Tam sprawdź komunikat o dacie i miejscu przed wyjściem.`
                : "Aktualne daty i miejsca podajemy w naszych oficjalnych kanałach. Sprawdź najnowszy komunikat przed wyjściem."}
            </p>

            <div className="ed-links-channels">
              {destinations.length ? (
                <SocialHub destinations={destinations} />
              ) : (
                <p className="ed-links-empty">Oficjalne kanały są właśnie konfigurowane. Jeśli chcesz do nas napisać, skorzystaj z kontaktu poniżej.</p>
              )}
            </div>

            <Link href={publicPage.contact} className="ed-links-contact">
              <span>
                <strong>Kontakt / współpraca</strong>
                <small>Pytania i propozycje współpracy</small>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
