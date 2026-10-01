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

export default function ContactPage() {
  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.contact, "Kontakt / współpraca", description)} />
      <main id="main-content" tabIndex={-1} className="ed-page flex-1 bg-background text-foreground">
        <div className="mx-auto w-[min(100%,1440px)] px-[clamp(20px,4.5vw,72px)]">
          <PublicBreadcrumb current="Kontakt / współpraca" className="mt-[10px]!" />

          <section className="grid min-h-[305px] grid-cols-[minmax(0,1fr)_auto] [align-items:end] gap-[clamp(24px,5vw,80px)] pt-[clamp(42px,6vw,88px)] pb-[clamp(34px,5vw,64px)] [@media(max-width:700px)]:block [@media(max-width:700px)]:min-h-0 [@media(max-width:700px)]:py-[38px]" aria-labelledby="contact-heading">
            <div>
              <h1 id="contact-heading" className="ed-serif m-0 text-[clamp(72px,9.6vw,148px)] leading-[0.91] font-normal tracking-[-0.03em] [@media(max-width:700px)]:max-w-[540px] [@media(max-width:700px)]:text-[clamp(64px,15.5vw,102px)] [@media(max-width:370px)]:text-[58px]!">
                Napisz do nas.
              </h1>
              <p className="mt-7 max-w-[570px] text-[clamp(17px,1.7vw,22px)] leading-[1.45] [@media(max-width:700px)]:mt-[22px] [@media(max-width:700px)]:text-[17px]">
                Masz pytanie o karaoke, pomysł na wspólne wydarzenie albo prowadzisz lokal? Najprościej skontaktować się z nami mailowo.
              </p>
            </div>
            <p className="ed-meta mb-[6px] whitespace-nowrap text-muted-foreground [@media(max-width:700px)]:mt-[22px]">Poza Nutą / Trójmiasto</p>
          </section>

          <section className="ed-inverse px-[clamp(22px,4vw,58px)] pt-[clamp(22px,3vw,40px)] pb-[clamp(16px,2vw,28px)] [@media(max-width:700px)]:-mx-5 [@media(max-width:700px)]:px-5 [@media(max-width:700px)]:pt-6 [@media(max-width:700px)]:pb-[18px]" aria-labelledby="contact-address-heading">
            <h2 id="contact-address-heading" className="ed-meta m-0 font-bold">Adres kontaktowy</h2>
            <TrackedContactLink
              email={getContactEmail()}
              className="min-h-[105px]! border-primary-foreground! text-primary-foreground! hover:border-accent! hover:text-accent! [@media(max-width:700px)]:min-h-[82px]!"
              textClassName="text-[clamp(26px,5.2vw,70px)]! [@media(max-width:700px)]:text-[clamp(24px,6vw,36px)]!"
            />
          </section>

          <div className="grid grid-cols-2 gap-[clamp(34px,7vw,110px)] pt-[clamp(52px,7vw,106px)] pb-[clamp(80px,9vw,130px)] [@media(max-width:700px)]:grid-cols-1 [@media(max-width:700px)]:gap-11 [@media(max-width:700px)]:pt-14 [@media(max-width:700px)]:pb-20">
            <section aria-labelledby="contact-venues-heading" className="min-w-0 border-t border-border pt-[22px]">
              <h2 id="contact-venues-heading" className="ed-serif mb-5 text-[clamp(38px,4vw,64px)] leading-[0.98] font-normal tracking-[-0.02em] [@media(max-width:700px)]:text-[clamp(40px,10vw,60px)]">Wspólne wydarzenie?</h2>
              <p className="m-0 max-w-[44ch] text-base leading-[1.55]">Jeśli piszesz w imieniu lokalu, podaj jego nazwę, miasto i pomysł. Termin oraz zakres współpracy ustalimy w rozmowie.</p>
              <Link href={publicPage.venues} data-cta-id="contact.venues" className="mt-[22px] inline-flex min-h-12 items-center gap-5 border-b border-b-foreground! text-[13px] font-bold tracking-[0.055em] no-underline uppercase hover:border-b-accent! hover:text-foreground [&_svg]:size-[18px]">
                Informacje dla lokali <ArrowRight aria-hidden="true" />
              </Link>
            </section>
            <section aria-labelledby="contact-dates-heading" className="min-w-0 border-t border-border pt-[22px]">
              <h2 id="contact-dates-heading" className="ed-serif mb-5 text-[clamp(38px,4vw,64px)] leading-[0.98] font-normal tracking-[-0.02em] [@media(max-width:700px)]:text-[clamp(40px,10vw,60px)]">Szukasz daty lub miejsca?</h2>
              <p className="m-0 max-w-[44ch] text-base leading-[1.55]">Aktualne informacje podajemy w oficjalnych kanałach. Sprawdź najnowszy komunikat przed wyjściem.</p>
              <Link href={publicPage.links} data-cta-id="contact.official_channels" className="mt-[22px] inline-flex min-h-12 items-center gap-5 border-b border-b-foreground! text-[13px] font-bold tracking-[0.055em] no-underline uppercase hover:border-b-accent! hover:text-foreground [&_svg]:size-[18px]">
                Zobacz oficjalne kanały <ArrowRight aria-hidden="true" />
              </Link>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
