import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { StructuredData } from "@/components/structured-data";
import { TrackPageView } from "@/components/track-page-view";
import { buttonVariants } from "@/components/ui/button";
import { publicMetadata, publicPageGraph } from "@/lib/seo";

const title = "Karaoke w Trójmieście";
const description = "Poza Nutą organizuje karaoke i wydarzenia muzyczne w Trójmieście. Dowiedz się, gdzie szukać aktualnych informacji i jak zaprosić nas do lokalu.";
export const metadata: Metadata = publicMetadata("/karaoke-trojmiasto", title, description);

export default function KaraokePage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col px-5 py-7 sm:px-7 sm:py-10">
      <TrackPageView />
      <StructuredData data={publicPageGraph("/karaoke-trojmiasto", title, description)} />
      <PublicBreadcrumb current={title} />
      <article className="flex-1 py-10 sm:py-14">
        <h1 className="font-display text-[clamp(3.4rem,12vw,5.5rem)] leading-[0.9] tracking-[-0.025em] text-foreground">Karaoke w Trójmieście</h1>
        <p className="mt-7 text-lg font-bold leading-7 text-foreground">Poza Nutą organizuje karaoke i wydarzenia muzyczne w Trójmieście.</p>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">Jeśli szukasz informacji o najbliższej okazji do śpiewania z Poza Nutą, przejdź do naszych oficjalnych profili. Znajdziesz je na stronie głównej. Daty i miejsca sprawdzaj w aktualnych komunikatach na profilach.</p>

        <section className="mt-12 border-t pt-8" aria-labelledby="venue-heading">
          <h2 id="venue-heading" className="text-xl font-bold tracking-tight">Chcesz zorganizować karaoke w lokalu?</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Poza Nutą współpracuje z lokalami w Trójmieście. Jeśli reprezentujesz lokal i chcesz porozmawiać o karaoke lub wydarzeniu muzycznym, zobacz informacje o współpracy i skontaktuj się z nami.</p>
          <Link href="/dla-lokali" className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-6 w-full justify-between sm:w-auto`}>
            Współpraca z lokalami <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>

        <section className="mt-12 border-t pt-8" aria-labelledby="channels-heading">
          <h2 id="channels-heading" className="text-xl font-bold tracking-tight">Oficjalne kanały Poza Nutą</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Sprawdź stronę główną, aby zobaczyć dostępne oficjalne profile Poza Nutą. To punkt wyjścia do bieżących informacji o marce.</p>
          <Link href="/" className={`${buttonVariants({ variant: "accent", size: "lg" })} mt-6 w-full justify-between sm:w-auto`}>
            Zobacz oficjalne profile <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </article>
      <footer className="flex items-center justify-between gap-4 border-t py-5 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Poza Nutą</span>
        <Link href="/privacy" className="inline-flex min-h-11 items-center font-bold text-foreground underline-offset-4 hover:underline">Prywatność</Link>
      </footer>
    </main>
  );
}
