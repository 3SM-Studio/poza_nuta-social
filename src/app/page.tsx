import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { SocialHub } from "@/components/social-hub";
import { StructuredData } from "@/components/structured-data";
import { TrackPageView } from "@/components/track-page-view";
import { buttonVariants } from "@/components/ui/button";
import { getPublicDestinations } from "@/lib/destinations";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { cn } from "cn";

export const revalidate = 60;
const homeDescription = "Poza Nutą organizuje karaoke i wydarzenia muzyczne w Trójmieście. Znajdź oficjalne profile, kontakt i informacje o współpracy.";
export const metadata: Metadata = publicMetadata("/", "Poza Nutą — karaoke i wydarzenia muzyczne w Trójmieście", homeDescription);

export default async function HomePage() {
  const destinations = await getPublicDestinations();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col px-5 py-7 sm:px-7 sm:py-10">
      <TrackPageView />
      <StructuredData data={publicPageGraph("/", "Poza Nutą", homeDescription, { includeOrganization: true, destinations })} />

      <section className="flex flex-1 flex-col justify-center py-10" aria-labelledby="hero-title">
        <div className="mb-9">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-accent">Trójmiasto</p>
          <h1 id="hero-title" className="font-display max-w-[8ch] text-[clamp(3.4rem,17vw,6.6rem)] font-normal leading-[0.82] tracking-[-0.025em] text-foreground">
            POZA NUTĄ
          </h1>
          <p className="mt-6 max-w-md text-base font-bold leading-snug text-foreground">
            Karaoke i wydarzenia muzyczne w Trójmieście.
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Oficjalne profile Poza Nutą, kontakt i informacje dla osób zainteresowanych współpracą — w jednym miejscu.
          </p>
        </div>

        {destinations.length ? (
          <SocialHub destinations={destinations} />
        ) : (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            Oficjalne linki są właśnie konfigurowane.
          </div>
        )}

        <Link
          href="/kontakt"
          className={cn(buttonVariants({ variant: "outline", size: "xl" }), "mt-3 w-full justify-between text-left")}
        >
          <span className="flex items-center gap-3">
            <BriefcaseBusiness className="size-5" aria-hidden="true" />
            <span>
              <span className="block">Kontakt / współpraca</span>
              <span className="mt-0.5 block text-xs font-medium text-muted-foreground">Dla lokali, firm i organizatorów</span>
            </span>
          </span>
          <ArrowRight className="size-4 opacity-60" aria-hidden="true" />
        </Link>

        <section className="mt-12 border-t pt-7" aria-labelledby="about-heading">
          <h2 id="about-heading" className="text-sm font-black uppercase tracking-[0.14em] text-foreground">O Poza Nutą</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Poza Nutą organizuje karaoke i wydarzenia muzyczne w Trójmieście. Ta strona jest oficjalną wizytówką marki i prowadzi do naszych aktualnych kanałów oraz kontaktu biznesowego.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold">
            <Link className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent" href="/karaoke-trojmiasto">Karaoke w Trójmieście</Link>
            <Link className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent" href="/dla-lokali">Współpraca z lokalami</Link>
          </div>
        </section>
      </section>

      <footer className="flex items-center justify-between gap-4 border-t py-5 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Poza Nutą</span>
        <div className="flex items-center gap-4">
          <Link className="font-bold text-foreground underline-offset-4 hover:underline" href="/kontakt">Kontakt</Link>
          <Link className="font-bold text-foreground underline-offset-4 hover:underline" href="/privacy">Prywatność</Link>
        </div>
      </footer>
    </main>
  );
}
