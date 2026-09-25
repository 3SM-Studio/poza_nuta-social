import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { PublicPageMain } from "@/components/public-page-main";
import { StructuredData } from "@/components/structured-data";
import { buttonVariants } from "@/components/ui/button";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { publicPage } from "@/lib/public-paths";

const title = "Karaoke w Trójmieście";
const description = "Poza Nutą organizuje karaoke i wydarzenia muzyczne w Trójmieście. Dowiedz się, gdzie szukać aktualnych informacji i jak zaprosić nas do lokalu.";
export const metadata: Metadata = publicMetadata(publicPage.karaoke, title, description);

export default function KaraokePage() {
  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.karaoke, title, description)} />
      <PublicPageMain>
      <PublicBreadcrumb current={title} />
      <article className="flex-1 pb-20 pt-10 sm:pb-28 sm:pt-14">
        <div className="border-t border-accent pt-6">
          <h1 className="font-display max-w-[11ch] text-[clamp(3.75rem,11vw,6rem)] leading-[0.88] tracking-[-0.025em] text-foreground">Karaoke w Trójmieście</h1>
          <p className="mt-8 max-w-xl text-xl font-bold leading-snug sm:text-2xl">Poza Nutą organizuje karaoke i wydarzenia muzyczne w Trójmieście.</p>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Jeśli chcesz dowiedzieć się, kiedy i gdzie spotykamy się przy muzyce, sprawdź aktualne komunikaty na naszych oficjalnych profilach.</p>
        </div>

        <section className="mt-16 border-t pt-8 sm:mt-20" aria-labelledby="channels-heading">
          <h2 id="channels-heading" className="font-display text-4xl leading-none sm:text-5xl">Gdzie sprawdzić daty i miejsca?</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Na stronie z oficjalnymi linkami znajdziesz aktywne profile Poza Nutą. Tam sprawdzaj najnowsze informacje przed wyjściem.</p>
          <Link href={publicPage.links} className={`${buttonVariants({ variant: "accent", size: "xl" })} mt-7 w-full justify-between whitespace-normal sm:w-auto`}>
            Zobacz oficjalne profile <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>

        <section className="mt-16 border-t pt-8 sm:mt-20" aria-labelledby="venue-heading">
          <h2 id="venue-heading" className="text-xl font-bold tracking-tight">Chcesz zorganizować karaoke w lokalu?</h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">Jeśli reprezentujesz lokal w Trójmieście, zobacz informacje o współpracy i skontaktuj się z nami.</p>
          <Link href={publicPage.venues} className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-6 w-full justify-between whitespace-normal sm:w-auto`}>
            Współpraca z lokalami <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </article>
      </PublicPageMain>
    </>
  );
}
