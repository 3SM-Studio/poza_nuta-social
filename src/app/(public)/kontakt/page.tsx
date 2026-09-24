import type { Metadata } from "next";
import Link from "next/link";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { PublicPageMain } from "@/components/public-page-main";
import { getContactEmail } from "@/lib/env";
import { TrackPageView } from "@/components/track-page-view";
import { TrackedContactLink } from "@/components/tracked-contact-link";
import { StructuredData } from "@/components/structured-data";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { publicPage } from "@/lib/public-paths";

const description = "Skontaktuj się z Poza Nutą w sprawie karaoke, wydarzeń muzycznych lub współpracy z lokalem w Trójmieście.";
export const metadata: Metadata = publicMetadata(publicPage.contact, "Kontakt i współpraca", description);

export default function ContactPage() {
  const email = getContactEmail();
  return (
    <>
      <TrackPageView contact />
      <StructuredData data={publicPageGraph(publicPage.contact, "Kontakt / współpraca", description)} />
      <PublicPageMain>
      <PublicBreadcrumb current="Kontakt / współpraca" />
      <div className="flex-1 py-10">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-accent">Poza Nutą · Trójmiasto</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Kontakt / współpraca</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
          Chcesz zorganizować karaoke, zaprosić Poza Nutą do lokalu albo porozmawiać o współpracy? Napisz do nas oficjalnym kanałem.
        </p>

        {email ? (
          <TrackedContactLink email={email} />
        ) : (
          <div className="mt-8 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            Oficjalny adres kontaktowy jest właśnie konfigurowany. Skorzystaj na razie z jednego z oficjalnych profili <Link href={publicPage.links} className="font-bold text-foreground underline underline-offset-4">na stronie z linkami</Link>.
          </div>
        )}
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold">
          <Link className="inline-flex min-h-11 items-center text-foreground underline decoration-accent underline-offset-4 hover:text-accent" href={publicPage.venues}>Informacje dla lokali</Link>
          <Link className="inline-flex min-h-11 items-center text-foreground underline decoration-accent underline-offset-4 hover:text-accent" href={publicPage.karaoke}>O karaoke</Link>
        </div>
      </div>
      </PublicPageMain>
    </>
  );
}
