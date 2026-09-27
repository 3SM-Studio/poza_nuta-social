import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { TrackedContactLink } from "@/components/tracked-contact-link";
import { StructuredData } from "@/components/structured-data";
import { getContactEmail } from "@/lib/env";
import { publicPage } from "@/lib/public-paths";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import "../contact-links.css";

const description = "Skontaktuj się z Poza Nutą w sprawie karaoke, wydarzeń muzycznych lub współpracy z lokalem w Trójmieście.";
export const metadata: Metadata = publicMetadata(publicPage.contact, "Kontakt i współpraca", description);

export default function ContactPage() {
  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.contact, "Kontakt / współpraca", description)} />
      <main id="main-content" tabIndex={-1} className="ed-page ed-contact">
        <div className="ed-contact-inner">
          <PublicBreadcrumb current="Kontakt / współpraca" />

          <section className="ed-contact-hero" aria-labelledby="contact-heading">
            <div className="ed-contact-heading-block">
              <h1 id="contact-heading" className="ed-serif ed-contact-title">
                Napisz do nas.
              </h1>
              <p className="ed-contact-intro">
                Masz pytanie o karaoke, pomysł na wspólne wydarzenie albo prowadzisz lokal? Najprościej skontaktować się z nami mailowo.
              </p>
            </div>
            <p className="ed-meta ed-contact-locale">Poza Nutą / Trójmiasto</p>
          </section>

          <section className="ed-inverse ed-contact-address" aria-labelledby="contact-address-heading">
            <h2 id="contact-address-heading" className="ed-meta ed-contact-address-label">Adres kontaktowy</h2>
            <TrackedContactLink email={getContactEmail()} />
          </section>

          <div className="ed-contact-routing">
            <section aria-labelledby="contact-venues-heading">
              <h2 id="contact-venues-heading" className="ed-serif ed-contact-routing-title">Wspólne wydarzenie?</h2>
              <p>Jeśli piszesz w imieniu lokalu, podaj jego nazwę, miasto i pomysł. Termin oraz zakres współpracy ustalimy w rozmowie.</p>
              <Link href={publicPage.venues} className="ed-contact-text-link">
                Informacje dla lokali <ArrowRight aria-hidden="true" />
              </Link>
            </section>
            <section aria-labelledby="contact-dates-heading">
              <h2 id="contact-dates-heading" className="ed-serif ed-contact-routing-title">Szukasz daty lub miejsca?</h2>
              <p>Aktualne informacje podajemy w oficjalnych kanałach. Sprawdź najnowszy komunikat przed wyjściem.</p>
              <Link href={publicPage.links} className="ed-contact-text-link">
                Zobacz oficjalne kanały <ArrowRight aria-hidden="true" />
              </Link>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
