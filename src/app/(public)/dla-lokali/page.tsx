import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";
import { StructuredData } from "@/components/structured-data";
import { publicPage } from "@/lib/public-paths";
import { publicMetadata, publicPageGraph } from "@/lib/seo";
import "../karaoke-venues.css";

const title = "Współpraca z lokalami";
const description = "Poza Nutą tworzy wydarzenia karaoke z lokalami i organizatorami w Trójmieście. Poznaj realizację iGranie w Lochu i skontaktuj się z nami w sprawie współpracy.";

export const metadata: Metadata = publicMetadata(publicPage.venues, title, description);

export default function VenuesPage() {
  return (
    <>
      <StructuredData data={publicPageGraph(publicPage.venues, title, description)} />
      <main id="main-content" tabIndex={-1} className="ed-page ed-venues">
        <div className="ed-shell ed-venues-breadcrumb"><PublicBreadcrumb current={title} /></div>
        <article>
          <header className="ed-venues-hero" aria-labelledby="venues-title">
            <div className="ed-shell">
              <div className="ed-venues-rule ed-meta"><span>Poza Nutą / współpraca</span><span>Trójmiasto</span></div>
              <h1 id="venues-title" className="ed-serif">Twój lokal.<br /><em>Wspólny wieczór.</em></h1>
              <div className="ed-venues-hero-bottom"><div className="ed-venues-hero-context"><p>Tworzymy karaoke i spotkania wokół muzyki we współpracy z lokalami oraz organizatorami w Trójmieście.</p><a href="#case-title" className="ed-venues-case-jump">Zobacz realizację: iGranie w Lochu · Gdynia, 16.08.2026 <ArrowUpRight aria-hidden="true" size={16} /></a></div><Link href={publicPage.contact} className="ed-action ed-venues-action">Porozmawiajmy o współpracy <ArrowUpRight aria-hidden="true" size={20} /></Link></div>
            </div>
          </header>

          <section className="ed-venues-case" aria-labelledby="case-title">
            <div className="ed-shell">
              <div className="ed-venues-case-heading"><div><p className="ed-meta">Zapis realizacji / 16 sierpnia 2026</p><h2 id="case-title" className="ed-serif">iGranie<br />w Lochu.</h2></div><p>Jedna z realizacji Poza Nutą w lokalu. Gdynia, 16 sierpnia 2026 roku.</p></div>
              <div className="ed-venues-case-grid">
                <figure className="ed-venues-case-figure"><div className="ed-venues-case-image"><Image src="/media/events/2026-08-16-igranie/igranie-case-study.webp" alt="Uczestniczka śpiewa podczas iGrania w Lochu; w tle widać ekran i nagłośnienie." fill sizes="(max-width: 760px) 100vw, 52vw" loading="eager" /></div><figcaption className="ed-caption ed-meta">Kadr z iGrania w Lochu / Gdynia, 16.08.2026</figcaption></figure>
                <div className="ed-venues-case-details"><p className="ed-venues-case-lead">Wieczór powstał we współpracy z lokalem. Poniżej opisujemy podział zadań w tej konkretnej realizacji.</p><dl className="ed-venues-facts"><div><dt>Poza Nutą</dt><dd>Prowadzenie wieczoru, przyjmowanie zgłoszeń utworów i prowadzenie kolejki występów.</dd></div><div><dt>Lokal</dt><dd>Nagłośnienie, mikrofony i projektory.</dd></div><div><dt>Dodatkowy sprzęt</dt><dd>Poza Nutą mogło zapewnić dodatkowy sprzęt w razie potrzeby.</dd></div></dl></div>
              </div>
            </div>
          </section>

          <section className="ed-venues-scope ed-inverse" aria-labelledby="scope-title"><div className="ed-shell ed-venues-scope-grid"><h2 id="scope-title" className="ed-serif">Każde miejsce<br />ma własny rytm.</h2><div><p className="ed-venues-scope-lead">Zakres kolejnej współpracy ustalamy osobno z każdym lokalem.</p><p>Rozmawiamy o przestrzeni, charakterze wydarzenia, prowadzeniu i zapleczu technicznym. Wspólnie określamy, co leży po której stronie. Przykład iGrania w Lochu nie jest gotowym pakietem dla innych miejsc.</p></div></div></section>

          <section className="ed-venues-contact" aria-labelledby="contact-title"><div className="ed-shell ed-venues-contact-grid"><div><h2 id="contact-title" className="ed-serif">Opowiedz nam<br />o swoim miejscu.</h2><p>Napisz, gdzie działasz i jaki rodzaj wieczoru chcesz zorganizować. Ustalimy, czy i jak możemy współpracować.</p></div><Link href={publicPage.contact} className="ed-action ed-venues-contact-action">Przejdź do kontaktu <ArrowUpRight aria-hidden="true" size={20} /></Link></div></section>
        </article>
      </main>
    </>
  );
}
