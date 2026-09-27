import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { StructuredData } from "@/components/structured-data";
import { publicPage } from "@/lib/public-paths";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import "../karaoke-venues.css";

const title = "Karaoke w Trójmieście";
const description = "Karaoke Poza Nutą w Trójmieście: przyjdź posłuchać albo zaśpiewać. Dowiedz się, jak zgłosić utwór na miejscu i gdzie sprawdzić aktualne daty.";

export const metadata: Metadata = publicMetadata(publicPage.karaoke, title, description);

const steps = [
  { number: "01", title: "Przyjdź na wydarzenie", detail: "Nie rezerwujesz występu przez Poza Nutą przed przyjściem." },
  { number: "02", title: "Zeskanuj kod QR", detail: "Kod do zgłoszeń znajdziesz na miejscu." },
  { number: "03", title: "Wpisz 6-cyfrowy kod sesji", detail: "To kod podany podczas danego wydarzenia." },
  { number: "04", title: "Wybierz lub dodaj utwór", detail: "Zgłoś piosenkę, którą chcesz zaśpiewać." },
  { number: "05", title: "Dołącz do kolejki", detail: "Poczekaj na swoją kolej i wyjdź do mikrofonu po wywołaniu." },
] as const;

export default function KaraokePage() {
  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.karaoke, title, description)} />
      <main id="main-content" tabIndex={-1} className="ed-page ed-karaoke">
        <div className="ed-shell ed-karaoke-breadcrumb"><PublicBreadcrumb current={title} /></div>
        <article>
          <header className="ed-karaoke-hero" aria-labelledby="karaoke-title">
            <div className="ed-shell ed-karaoke-hero-grid">
              <div className="ed-karaoke-hero-copy">
                <div className="ed-karaoke-topline ed-meta"><span>Poza Nutą / przewodnik</span><span>Trójmiasto</span></div>
                <h1 id="karaoke-title" className="ed-serif">Karaoke<br />w Trójmieście<span className="ed-karaoke-title-stop">.</span></h1>
                <p className="ed-karaoke-lead">Możesz przyjść dla muzyki i ludzi. Mikrofon bierzesz tylko wtedy, gdy masz ochotę.</p>
                <div className="ed-karaoke-hero-bottom">
                  <Link href={publicPage.links} className="ed-action ed-karaoke-action">Gdzie sprawdzić daty <ArrowUpRight aria-hidden="true" size={20} /></Link>
                  <p>Daty i miejsca podajemy w oficjalnych kanałach Poza Nutą.</p>
                </div>
              </div>
              <figure className="ed-karaoke-hero-figure">
                <Image src="/media/events/2026-08-16-igranie/experience-solo.webp" alt="Uczestnik śpiewa do mikrofonu podczas iGrania w Lochu w Gdyni." fill sizes="(max-width: 760px) 100vw, 42vw" className="ed-karaoke-hero-image" priority />
                <figcaption className="ed-karaoke-photo-caption ed-meta"><span>iGranie w Lochu<br />Gdynia, 16.08.2026</span><span>Kadr z wydarzenia</span></figcaption>
              </figure>
            </div>
          </header>

          <section className="ed-karaoke-choice ed-inverse" aria-labelledby="choice-title">
            <div className="ed-shell ed-karaoke-choice-inner">
              <h2 id="choice-title" className="ed-serif">Udział ma<br /><em>wiele głosów.</em></h2>
              <div className="ed-karaoke-choice-copy">
                <p>Nie musisz śpiewać, żeby być częścią wieczoru. Możesz słuchać, rozmawiać i spędzić czas ze znajomymi.</p>
                <p>Jeśli zechcesz wystąpić, zgłaszasz utwór na miejscu. Nie potrzebujesz doświadczenia wokalnego.</p>
              </div>
            </div>
          </section>

          <section className="ed-karaoke-steps" aria-labelledby="steps-title">
            <div className="ed-shell ed-karaoke-steps-layout">
              <div className="ed-karaoke-steps-intro">
                <h2 id="steps-title">Jak wziąć<br /><em>mikrofon?</em></h2>
                <p>To dzieje się podczas wydarzenia. Zgłoszenia obsługuje niezależna platforma karaoke.</p>
              </div>
              <ol className="ed-karaoke-step-list" aria-label="Zgłoszenie utworu krok po kroku">
                {steps.map((step) => (
                  <li key={step.number} className="ed-karaoke-step">
                    <span className="ed-karaoke-step-number ed-serif" aria-hidden="true">{step.number}</span>
                    <div><h3>{step.title}</h3><p>{step.detail}</p></div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="ed-karaoke-dates" aria-labelledby="dates-title">
            <div className="ed-shell ed-karaoke-dates-inner">
              <h2 id="dates-title" className="ed-serif">Gdzie i kiedy<br /><em>się widzimy?</em></h2>
              <div className="ed-karaoke-dates-copy"><p>Aktualne terminy i miejsca ogłaszamy przez oficjalne kanały. Sprawdź najnowszą informację przed wyjściem.</p><Link href={publicPage.links} className="ed-action ed-karaoke-dates-action">Przejdź do oficjalnych kanałów <ArrowUpRight aria-hidden="true" size={20} /></Link></div>
            </div>
          </section>

          <aside className="ed-karaoke-venue-bridge" aria-labelledby="venue-bridge-title"><div className="ed-shell ed-karaoke-venue-bridge-inner"><div><h2 id="venue-bridge-title">Prowadzisz lokal?</h2><p>Zobacz, jak rozmawiamy o wspólnym wydarzeniu w Trójmieście.</p></div><Link href={publicPage.venues} className="ed-text-link">Informacje dla lokali <ArrowUpRight aria-hidden="true" size={18} /></Link></div></aside>
        </article>
      </main>
    </>
  );
}
