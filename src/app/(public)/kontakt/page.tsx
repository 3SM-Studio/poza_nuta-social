import type { Metadata } from "next";
import Link from "next/link";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { PublicPageMain } from "@/components/public-page-main";
import { getContactEmail } from "@/lib/env";
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
      <StructuredData data={publicPageGraph(publicPage.contact, "Kontakt / współpraca", description)} />
      <PublicPageMain>
      <PublicBreadcrumb current="Kontakt / współpraca" />
      <div className="flex-1 pb-20 pt-10 sm:pb-28 sm:pt-14">
        <div className="border-t border-accent pt-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">Poza Nutą · Trójmiasto</p>
          <h1 className="font-display mt-4 text-[clamp(3.5rem,11vw,5.5rem)] leading-[0.9] tracking-[-0.025em]">Kontakt / współpraca</h1>
          <p className="mt-7 max-w-lg text-xl font-bold leading-snug sm:text-2xl">Masz pytanie o Poza Nutą lub pomysł na wydarzenie?</p>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">Napisz do nas. Jeśli reprezentujesz lokal, podaj jego nazwę, miasto i pomysł na wydarzenie. Termin oraz zakres współpracy możemy ustalić w rozmowie.</p>
        </div>

        <TrackedContactLink email={email} />
        <section className="mt-12 border-t pt-7" aria-labelledby="dates-heading">
          <h2 id="dates-heading" className="text-xl font-bold tracking-tight">Szukasz daty lub miejsca karaoke?</h2>
          <p className="mt-3 max-w-lg text-base leading-7 text-muted-foreground">Bieżące informacje o wydarzeniach znajdziesz w oficjalnych kanałach Poza Nutą. Sprawdź najnowszy komunikat przed wyjściem.</p>
          <Link className="mt-3 inline-flex min-h-11 items-center font-bold text-foreground underline decoration-accent underline-offset-4 hover:text-accent" href={publicPage.links}>Przejdź do oficjalnych kanałów</Link>
        </section>
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold">
          <Link className="inline-flex min-h-11 items-center text-foreground underline decoration-accent underline-offset-4 hover:text-accent" href={publicPage.venues}>Informacje dla lokali</Link>
          <Link className="inline-flex min-h-11 items-center text-foreground underline decoration-accent underline-offset-4 hover:text-accent" href={publicPage.karaoke}>O karaoke</Link>
        </div>
      </div>
      </PublicPageMain>
    </>
  );
}
