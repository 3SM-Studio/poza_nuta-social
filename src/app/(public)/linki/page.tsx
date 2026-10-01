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
const description = "Oficjalne kanały Poza Nutą oraz kontakt. Aktualne informacje o wieczorach karaoke w Trójmieście.";
export const metadata: Metadata = publicMetadata(publicPage.links, title, description);

export default async function LinksPage() {
  const destinations = await getPublicDestinations();
  const soleChannel = destinations.length === 1 ? destinations[0] : null;

  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.links, title, description)} />
      <main id="main-content" tabIndex={-1} className="ed-page flex-1 bg-background text-foreground">
        <div className="mx-auto w-[min(100%,700px)] px-[clamp(20px,4vw,32px)]">
          <PublicBreadcrumb current={title} className="mt-[10px]!" />

          <section className="pt-[clamp(30px,5vw,64px)] pb-[clamp(72px,9vw,120px)] [@media(max-width:700px)]:pt-8" aria-labelledby="links-heading">
            <h1 id="links-heading" className="ed-serif m-0 max-w-[650px] text-[clamp(65px,9vw,110px)] leading-[0.91] font-normal tracking-[-0.03em] [@media(max-width:700px)]:text-[clamp(62px,15vw,86px)] [@media(max-width:370px)]:text-[58px]!">Oficjalne kanały.</h1>
            <p className="mt-[22px] max-w-[53ch] text-[17px] leading-[1.5] [@media(max-width:700px)]:mt-5 [@media(max-width:700px)]:text-base">
              {soleChannel
                ? `Obecnie aktywny kanał: ${soleChannel.label}. Tam sprawdź komunikat o dacie i miejscu przed wyjściem.`
                : "Aktualne daty i miejsca podajemy w naszych oficjalnych kanałach. Sprawdź najnowszy komunikat przed wyjściem."}
            </p>

            <div className="mt-[38px] border-t-2 border-t-foreground! [@media(max-width:700px)]:mt-7">
              {destinations.length ? (
                <SocialHub
                  destinations={destinations}
                  listClassName="border-t-0!"
                  linkClassName="border-border! px-3! text-foreground! no-underline! hover:border-foreground! hover:bg-primary-foreground! hover:text-foreground! data-[channel=instagram]:border-foreground! data-[channel=instagram]:bg-accent! data-[channel=instagram]:text-foreground! data-[channel=instagram]:hover:bg-foreground! data-[channel=instagram]:hover:text-primary-foreground! data-[channel=instagram]:[&_span]:text-inherit! data-[channel=facebook]:text-muted-foreground!"
                />
              ) : (
                <p className="m-0 border-b border-border px-[10px] py-[26px] text-base leading-[1.55]">Oficjalne kanały są właśnie konfigurowane. Jeśli chcesz do nas napisać, skorzystaj z kontaktu poniżej.</p>
              )}
            </div>

            <Link href={publicPage.contact} data-cta-id="links.contact" className="flex min-h-[90px] items-center justify-between gap-4 border-b border-b-foreground! px-3 py-4 no-underline hover:bg-primary-foreground hover:text-foreground">
              <span>
                <strong className="block text-[19px] font-semibold">Kontakt / współpraca</strong>
                <small className="mt-[3px] block text-[13px] text-muted-foreground">Pytania i propozycje współpracy</small>
              </span>
              <ArrowRight aria-hidden="true" className="size-[22px] flex-none" />
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
