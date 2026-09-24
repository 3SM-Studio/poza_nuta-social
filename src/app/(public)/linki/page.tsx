import Link from "next/link";
import type { Metadata } from "next";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { PublicPageMain } from "@/components/public-page-main";
import { SocialHub } from "@/components/social-hub";
import { StructuredData } from "@/components/structured-data";
import { TrackPageView } from "@/components/track-page-view";
import { getPublicDestinations } from "@/lib/destinations";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { publicPage } from "@/lib/public-paths";

const title = "Oficjalne linki";
const description = "Oficjalne kanały Poza Nutą oraz kontakt. Karaoke i wydarzenia muzyczne w Trójmieście.";
export const metadata: Metadata = publicMetadata(publicPage.links, title, description);

export default async function LinksPage() {
  const destinations = await getPublicDestinations();

  return (
    <>
      <TrackPageView />
      <StructuredData data={publicPageGraph(publicPage.links, title, description)} />
      <PublicPageMain width="links">
      <PublicBreadcrumb current={title} />
      <section className="flex flex-1 flex-col justify-center py-14 sm:py-20" aria-labelledby="links-heading">
        <h1 id="links-heading" className="font-display text-[clamp(4rem,13vw,6rem)] leading-[0.85] tracking-[-0.025em]">Poza Nutą</h1>
        <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">Karaoke i wydarzenia muzyczne w Trójmieście. Tu znajdziesz nasze oficjalne kanały.</p>
        <div className="mt-9">
          {destinations.length ? <SocialHub destinations={destinations} /> : <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Oficjalne linki są właśnie konfigurowane.</p>}
        </div>
        <Link href={publicPage.contact} className="mt-7 inline-flex min-h-11 items-center self-start font-bold text-foreground underline decoration-accent underline-offset-4 hover:text-accent">Kontakt / współpraca</Link>
      </section>
      </PublicPageMain>
    </>
  );
}
