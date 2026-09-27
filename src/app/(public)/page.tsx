import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { StructuredData } from "@/components/structured-data";
import { getPublicDestinations } from "@/lib/destinations";
import { publicPage } from "@/lib/public-paths";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import "./home-editorial.css";

const description = "Poza Nutą organizuje spotkania karaoke i wydarzenia muzyczne w Trójmieście. Możesz przyjść, słuchać, spędzić czas z ludźmi albo zaśpiewać.";
export const metadata: Metadata = publicMetadata(publicPage.home, "Poza Nutą — karaoke i wydarzenia muzyczne w Trójmieście", description);

const steps = [
  ["01", "Przyjdź", "Nie rezerwujesz występu przez Poza Nutą przed przyjściem.", "wejście"],
  ["02", "Zeskanuj QR", "Kod QR czeka na miejscu podczas wydarzenia.", "na miejscu"],
  ["03", "Wpisz kod sesji", "Wpisz sześciocyfrowy kod sesji wydarzenia.", "dostęp"],
  ["04", "Wybierz utwór", "Wybierz piosenkę lub dodaj własną propozycję.", "wybór"],
  ["05", "Dołącz do kolejki", "Po zgłoszeniu utworu poczekaj na swoją kolej.", "oczekiwanie"],
  ["06", "Zaśpiewaj", "Kiedy nadejdzie Twoja kolej, wychodzisz do mikrofonu.", "twój moment"],
] as const;

export default async function HomePage() {
  const destinations = await getPublicDestinations();
  return <>
    <StructuredData data={publicPageGraph(publicPage.home, "Poza Nutą", description, { includeOrganization: true, destinations })} />
    <main id="main-content" tabIndex={-1} className="ed-home-main">
      <section className="ed-home-hero" aria-labelledby="hero-title">
        <div className="ed-home-hero-copy">
          <div className="ed-home-hero-index ed-meta"><span>Poza Nutą / Trójmiasto</span><span>Karaoke i spotkania muzyczne</span></div>
          <h1 id="hero-title" className="ed-home-hero-title ed-serif">Zanim ktoś<br />chwyci <em>mikrofon.</em></h1>
          <div className="ed-home-hero-bottom">
            <p>Poza Nutą tworzy spotkania karaoke w Trójmieście. Możesz śpiewać, słuchać albo po prostu spędzić wieczór z ludźmi.</p>
            <div className="ed-home-hero-actions">
              <Link href={publicPage.karaoke} className="ed-action">Informacje o karaoke <ArrowUpRight aria-hidden="true" /></Link>
              <Link href={publicPage.links} className="ed-text-link">Daty w oficjalnych kanałach <ArrowUpRight aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
        <figure className="ed-home-hero-figure">
          <Image src="/media/events/2026-08-16-igranie/experience-group-poster.webp" alt="Dwie osoby śpiewają razem podczas wieczoru Poza Nutą." fill priority sizes="(max-width: 700px) 100vw, 44vw" className="ed-home-hero-photo" />
          <figcaption className="ed-home-hero-caption ed-meta"><span>iGranie w Lochu<br />Gdynia · 16.08.2026</span><span>Kadr z wydarzenia</span></figcaption>
        </figure>
      </section>

      <div className="ed-home-band"><BrandLogo className="ed-home-band-logo" /><p>Nie trzeba występować, żeby być częścią wieczoru.</p><span className="ed-meta">Poza Nutą / Trójmiasto</span></div>

      <section className="ed-home-experience" aria-labelledby="experience-title">
        <div className="ed-home-section-index ed-meta">Dwie strony jednego wieczoru</div>
        <div className="ed-home-experience-body">
          <div className="ed-home-experience-intro"><h2 id="experience-title" className="ed-serif">Miejsce jest<br /><em>także dla ciebie.</em></h2><p>Możesz zostać przy stoliku, rozmawiać i słuchać. Jeśli zechcesz, możesz też dołączyć do śpiewania.</p></div>
          <div className="ed-home-experience-photos">
            <figure className="ed-home-story ed-home-story-social"><div className="ed-home-story-image"><Image src="/media/events/2026-08-16-igranie/experience-social.webp" alt="Uczestniczki spędzają czas przy stoliku podczas wieczoru Poza Nutą." fill sizes="(max-width: 700px) 100vw, 35vw" /></div><figcaption><span className="ed-home-story-title">Być na miejscu</span><span className="ed-meta">A / słuchanie</span><p>Muzyka jest obok rozmów. Udział nie wymaga wyjścia przed wszystkich.</p></figcaption></figure>
            <figure className="ed-home-story ed-home-story-solo"><div className="ed-home-story-image"><Image src="/media/events/2026-08-16-igranie/experience-solo.webp" alt="Uczestnik śpiewa do mikrofonu podczas wydarzenia Poza Nutą w lokalu." fill sizes="(max-width: 700px) 100vw, 43vw" /></div><figcaption><span className="ed-home-story-title">Wziąć mikrofon</span><span className="ed-meta">B / śpiewanie</span><p>Jeśli masz ochotę, wybierasz utwór na miejscu i dołączasz do kolejki.</p></figcaption></figure>
          </div>
        </div>
      </section>

      <section className="ed-home-participation" aria-labelledby="participation-title">
        <div className="ed-home-section-index ed-meta">Instrukcja dla chętnych do mikrofonu</div>
        <div className="ed-home-participation-body">
          <div className="ed-home-participation-heading"><h2 id="participation-title">A jeśli chcesz<br /><em>zaśpiewać?</em></h2><p>Wszystko zaczyna się na wydarzeniu. Sześć prostych kroków prowadzi od wejścia do Twojego utworu.</p></div>
          <ol className="ed-home-setlist" aria-label="Jak zgłosić utwór podczas wydarzenia">{steps.map(([number, title, detail, cue]) => <li key={number}><span className="ed-home-setlist-number ed-serif">{number}</span><span className="ed-home-setlist-title">{title}</span><span className="ed-home-setlist-cue ed-meta">{cue}</span><span className="ed-home-setlist-detail">{detail}</span></li>)}</ol>
          <Link href={publicPage.karaoke} className="ed-text-link ed-home-setlist-link">Udział krok po kroku <ArrowUpRight aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="ed-home-case" aria-labelledby="case-title">
        <div className="ed-home-section-index ed-meta">Archiwum / prawdziwy wieczór</div>
        <div className="ed-home-case-body">
          <div className="ed-home-case-head"><p className="ed-home-case-date ed-serif" aria-label="16 sierpnia 2026">16 <span>/</span> 08</p><h2 id="case-title" className="ed-serif">iGranie<br /><em>w Lochu.</em></h2><p>W tym gdyńskim lokalu Poza Nutą prowadzi cykliczne wieczory karaoke. Kadr dokumentuje wydarzenie z 16 sierpnia 2026 r.</p></div>
          <figure className="ed-home-case-figure"><div className="ed-home-case-image"><Image src="/media/events/2026-08-16-igranie/igranie-case-study.webp" alt="Uczestniczka śpiewa w lokalu iGranie w Lochu; widać ekran i nagłośnienie." fill sizes="(max-width: 700px) 100vw, 44vw" /></div><figcaption className="ed-meta">Gdynia · iGranie w Lochu · 16.08.2026</figcaption></figure>
          <div className="ed-home-case-facts"><p className="ed-home-case-lead">Jeden wieczór, dwa punkty widzenia: ludzie przy muzyce i miejsce, które ich gromadzi.</p><dl><div><dt>Poza Nutą</dt><dd>Prowadzenie wieczoru i obsługa zgłoszeń utworów oraz kolejki.</dd></div><div><dt>Lokal</dt><dd>Nagłośnienie, mikrofony i projektory w tej realizacji.</dd></div></dl><Link href={publicPage.venues} className="ed-text-link">Współpraca z lokalami <ArrowUpRight aria-hidden="true" /></Link></div>
        </div>
      </section>

      <section className="ed-home-next" aria-labelledby="next-title"><div className="ed-home-next-meta ed-meta"><span>Co dalej?</span><span>Trójmiasto / Poza Nutą</span></div><h2 id="next-title" className="ed-serif">Dołącz do<br /><em>wieczoru.</em></h2><div className="ed-home-next-bottom"><p>Aktualne daty i miejsca spotkań znajdziesz w oficjalnych kanałach. Sprawdź najnowszy komunikat przed wyjściem.</p><Link href={publicPage.links} className="ed-home-next-link">Gdzie sprawdzić daty <ArrowDownRight aria-hidden="true" /></Link></div></section>
    </main>
  </>;
}
