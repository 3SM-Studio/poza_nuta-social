import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "cn";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { StructuredData } from "@/components/structured-data";
import { buttonVariants } from "@/components/ui/button";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import { publicPage } from "@/lib/public-paths";

const title = "Karaoke w Trójmieście";
const description = "Przyjdź posłuchać lub zaśpiewać na karaoke Poza Nutą w Trójmieście. Sprawdź, jak zgłosić utwór na miejscu i gdzie znaleźć aktualne daty.";

export const metadata: Metadata = publicMetadata(publicPage.karaoke, title, description);

const participationSteps = [
  {
    number: "01",
    title: "Przyjdź na wydarzenie",
    detail: "Nie rezerwujesz występu przez Poza Nutą przed przyjściem.",
  },
  {
    number: "02",
    title: "Zeskanuj QR",
    detail: "Kod QR znajdziesz na miejscu. Wpisz sześciocyfrowy kod sesji wydarzenia.",
  },
  {
    number: "03",
    title: "Wybierz utwór",
    detail: "Wybierz piosenkę lub dodaj własną propozycję.",
  },
  {
    number: "04",
    title: "Dołącz do kolejki",
    detail: "Po zgłoszeniu utworu poczekaj na swoją kolej.",
  },
  {
    number: "05",
    title: "Zaśpiewaj po wywołaniu",
    detail: "Kiedy nadejdzie Twoja kolej, wychodzisz do mikrofonu.",
  },
] as const;

export default function KaraokePage() {
  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.karaoke, title, description)} />
      <main id="main-content" tabIndex={-1} className="w-full flex-1">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
          <PublicBreadcrumb current={title} />
        </div>

        <article className="pb-20 sm:pb-28">
          <section className="pt-7 sm:pt-10" aria-labelledby="karaoke-title">
            <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[minmax(0,1.16fr)_minmax(19rem,0.84fr)] lg:gap-12 lg:px-12 xl:gap-20">
              <div className="flex min-w-0 flex-col border-t border-accent pt-5 sm:pt-7">
                <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Poza Nutą / Przewodnik uczestnika</span>
                  <span className="hidden sm:inline">Trójmiasto</span>
                </div>
                <h1 id="karaoke-title" className="font-display mt-7 max-w-full text-[clamp(5rem,11vw,8rem)] leading-[0.82] tracking-[-0.025em] text-foreground sm:mt-10">
                  Karaoke
                  <span className="mt-1 block text-[clamp(3.2rem,7.8vw,6rem)] leading-[0.95] text-accent sm:mt-2">w Trójmieście</span>
                </h1>
                <p className="mt-9 max-w-[29ch] text-xl font-bold leading-snug tracking-tight sm:mt-12 sm:text-2xl">
                  Przychodzisz dla muzyki i ludzi. Mikrofon bierzesz tylko wtedy, gdy masz ochotę.
                </p>
                <div className="mt-6 flex flex-col items-start gap-3 sm:mt-8">
                  <Link href={publicPage.links} className={cn(buttonVariants({ variant: "accent", size: "xl" }), "w-full justify-between rounded-none px-6 text-left sm:w-auto sm:min-w-72")}>
                    Gdzie sprawdzić daty <ArrowUpRight aria-hidden="true" />
                  </Link>
                  <p className="max-w-[42ch] text-xs leading-5 text-muted-foreground">Daty i miejsca publikujemy w oficjalnych kanałach Poza Nutą.</p>
                </div>
                <p className="mt-6 max-w-[52ch] text-base leading-7 text-muted-foreground sm:mt-8 sm:text-lg sm:leading-8">
                  Na karaoke Poza Nutą możesz śpiewać, słuchać albo po prostu spędzić wieczór ze znajomymi. Nie potrzebujesz doświadczenia ani wcześniejszej rezerwacji występu.
                </p>
              </div>

              <figure className="w-full min-w-0 sm:mx-auto sm:max-w-[34rem] lg:mx-0 lg:max-w-none lg:pt-12">
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-secondary sm:aspect-[3/4]">
                  <Image
                    src="/media/events/2026-08-16-igranie/experience-solo.webp"
                    alt="Uczestnik śpiewa do mikrofonu podczas wydarzenia Poza Nutą w lokalu."
                    fill
                    sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1024px) calc(100vw - 64px), 38vw"
                    className="object-cover object-[center_32%]"
                    priority
                  />
                </div>
                <figcaption className="mt-3 flex flex-wrap justify-between gap-x-5 gap-y-1 border-t border-border pt-3 text-xs font-bold uppercase leading-5 tracking-[0.12em] text-muted-foreground">
                  <span>Kadr z wydarzenia</span>
                  <span>iGranie w Lochu · Gdynia</span>
                </figcaption>
              </figure>
            </div>
          </section>

          <section className="mt-24 sm:mt-32 lg:mt-40" aria-labelledby="no-pressure-title">
            <div className="mx-auto grid w-full max-w-7xl gap-10 border-t border-border px-5 pt-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:gap-20 lg:px-12">
              <div>
                <h2 id="no-pressure-title" className="font-display max-w-[11ch] text-[clamp(3.8rem,8vw,7rem)] leading-[0.88] tracking-[-0.025em]">
                  Bez presji.<br /><span className="text-accent">Z muzyką.</span>
                </h2>
              </div>
              <div className="grid content-start gap-8 sm:grid-cols-2 lg:grid-cols-1 lg:gap-10">
                <div className="border-t border-border pt-4">
                  <h3 className="text-lg font-bold tracking-tight sm:text-xl">Czy muszę śpiewać?</h3>
                  <p className="mt-3 max-w-[52ch] text-base leading-7 text-muted-foreground">Nie. Możesz przyjść posłuchać, pobyć ze znajomymi i zostać częścią wieczoru bez wychodzenia do mikrofonu.</p>
                </div>
                <div className="border-t border-border pt-4">
                  <h3 className="text-lg font-bold tracking-tight sm:text-xl">A jeśli nie umiem?</h3>
                  <p className="mt-3 max-w-[52ch] text-base leading-7 text-muted-foreground">Nie potrzebujesz umiejętności wokalnych. Jeśli chcesz zaśpiewać, po prostu wybierasz utwór na miejscu.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-28 sm:mt-36 lg:mt-44" aria-labelledby="participation-title">
            <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-20 lg:px-12">
              <div className="border-t border-accent pt-6">
                <h2 id="participation-title" className="font-display max-w-[10ch] text-[clamp(3.4rem,6.6vw,6rem)] leading-[0.91] tracking-[-0.025em]">Kiedy chcesz zaśpiewać</h2>
                <p className="mt-6 max-w-[38ch] text-base leading-7 text-muted-foreground">Zgłaszasz utwór podczas wydarzenia. Całość zaczyna się od kodu QR dostępnego na miejscu.</p>
              </div>
              <ol className="border-t border-border" aria-label="Jak zgłosić utwór podczas wydarzenia">
                {participationSteps.map((step) => (
                  <li key={step.number} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 border-b border-border py-5 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-5 sm:py-7">
                    <span className="font-display text-3xl leading-none text-accent sm:text-4xl" aria-hidden="true">{step.number}</span>
                    <div>
                      <h3 className="text-lg font-bold leading-snug tracking-tight sm:text-xl">{step.title}</h3>
                      <p className="mt-2 max-w-[54ch] text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="mt-28 sm:mt-36 lg:mt-44" aria-labelledby="dates-title">
            <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
              <div className="grid gap-7 border-y border-accent py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:items-end lg:gap-20">
                <h2 id="dates-title" className="font-display max-w-[12ch] text-[clamp(3.5rem,7vw,6rem)] leading-[0.9] tracking-[-0.025em]">Gdzie i kiedy?</h2>
                <div>
                  <p className="max-w-[47ch] text-base leading-7 text-muted-foreground">Aktualne daty i miejsca sprawdź w oficjalnych kanałach Poza Nutą. Zajrzyj do najnowszych informacji przed wyjściem.</p>
                  <Link href={publicPage.links} className="mt-6 inline-flex min-h-11 items-center gap-4 border-b border-accent pb-1 text-base font-bold text-foreground transition-colors hover:text-accent">
                    Oficjalne kanały i aktualności <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <aside className="mt-20 sm:mt-28" aria-labelledby="venue-title">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 border-t border-border px-5 pt-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-12">
              <div>
                <h2 id="venue-title" className="text-lg font-bold tracking-tight">Prowadzisz lokal w Trójmieście?</h2>
                <p className="mt-2 max-w-[60ch] text-sm leading-6 text-muted-foreground">Zobacz, jak może wyglądać współpraca przy wydarzeniu z Poza Nutą.</p>
              </div>
              <Link href={publicPage.venues} className="inline-flex min-h-11 w-fit shrink-0 items-center gap-3 border-b border-border pb-1 text-sm font-bold transition-colors hover:border-accent hover:text-accent">
                Informacje dla lokali <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </article>
      </main>
    </>
  );
}
