import type { Metadata } from "next";
import Link from "next/link";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { getContactEmail } from "@/lib/env";
import { TrackPageView } from "@/components/track-page-view";
import { TrackedContactLink } from "@/components/tracked-contact-link";
import { StructuredData } from "@/components/structured-data";
import { publicMetadata, publicPageGraph } from "@/lib/seo";

const description = "Skontaktuj się z Poza Nutą w sprawie karaoke, wydarzeń muzycznych lub współpracy z lokalem w Trójmieście.";
export const metadata: Metadata = publicMetadata("/kontakt", "Kontakt i współpraca", description);

export default function ContactPage() {
  const email = getContactEmail();
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col px-5 py-7 sm:px-7 sm:py-10">
      <TrackPageView contact />
      <StructuredData data={publicPageGraph("/kontakt", "Kontakt / współpraca", description)} />
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
            Oficjalny adres kontaktowy jest właśnie konfigurowany. Skorzystaj na razie z jednego z oficjalnych profili na stronie głównej.
          </div>
        )}
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold">
          <Link className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent" href="/dla-lokali">Informacje dla lokali</Link>
          <Link className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent" href="/karaoke-trojmiasto">O karaoke</Link>
        </div>
      </div>
      <footer className="border-t py-5 text-xs text-muted-foreground">© {new Date().getFullYear()} Poza Nutą</footer>
    </main>
  );
}
