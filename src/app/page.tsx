import Link from "next/link";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { SocialHub } from "@/components/social-hub";
import { TrackPageView } from "@/components/track-page-view";
import { buttonVariants } from "@/components/ui/button";
import { getPublicDestinations } from "@/lib/destinations";
import { getSiteUrl } from "@/lib/env";
import { cn } from "cn";

export const revalidate = 60;

export default async function HomePage() {
  const destinations = await getPublicDestinations();
  const siteUrl = getSiteUrl();
  const sameAs = destinations
    .map((item) => item.url)
    .filter((url) => url.startsWith("http://") || url.startsWith("https://"));

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Poza Nutą",
    url: siteUrl,
    description: "Poza Nutą organizuje karaoke i wydarzenia muzyczne w Trójmieście.",
    areaServed: "Trójmiasto",
    sameAs,
  };

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col px-5 py-7 sm:px-7 sm:py-10">
      <TrackPageView />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\u003c") }}
      />

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
