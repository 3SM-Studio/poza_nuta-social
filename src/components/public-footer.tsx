import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { PrivacySettingsControl } from "@/components/consent-controls";
import { getPublicDestinations } from "@/lib/destinations";
import { publicNavigation } from "@/lib/public-navigation";
import { publicPage } from "@/lib/public-paths";

export async function PublicFooter() {
  const destinations = await getPublicDestinations();
  return (
    <footer className="ed-footer ed-inverse">
      <div className="ed-shell">
        <div className="ed-footer__opening">
          <div className="ed-footer__identity">
            <BrandLogo className="ed-footer__mark" />
            <span className="ed-meta">Poza Nutą / Trójmiasto</span>
          </div>
          <p className="ed-footer__statement ed-serif">Karaoke i wydarzenia muzyczne <em>w Trójmieście.</em></p>
        </div>
        <div className="ed-footer__directory">
          <div className="ed-footer__brandline ed-serif" aria-hidden="true">Trójmiasto</div>
          <div className="ed-footer__columns">
            <div className="ed-footer__group">
              <h2 className="ed-meta">Na stronie</h2>
              <nav aria-label="Nawigacja w stopce">
                {publicNavigation.map(({ href, label }) => <Link key={href} href={href} className="ed-footer__link">{label}<ArrowUpRight aria-hidden="true" /></Link>)}
              </nav>
            </div>
            <div className="ed-footer__group">
              <h2 className="ed-meta">Oficjalne kanały</h2>
              {destinations.length ? (
                <ul>{destinations.map(({ slug, label }) => <li key={slug}><Link href={`/go/${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer" className="ed-footer__link" aria-label={`Otwórz ${label} w nowej karcie`}>{label}<ArrowUpRight aria-hidden="true" /></Link></li>)}</ul>
              ) : <p className="ed-footer__empty">Kanały są właśnie konfigurowane.</p>}
            </div>
            <div className="ed-footer__group">
              <h2 className="ed-meta">Twoja prywatność</h2>
              <Link href={publicPage.privacy} className="ed-footer__link">Prywatność<ArrowUpRight aria-hidden="true" /></Link>
              <Link href={publicPage.cookies} className="ed-footer__link">Cookies<ArrowUpRight aria-hidden="true" /></Link>
              <div className="ed-footer__settings"><PrivacySettingsControl /></div>
            </div>
          </div>
        </div>
        <div className="ed-footer__bottom ed-meta"><span>© {new Date().getFullYear()} Poza Nutą</span><span>Trójmiasto / Polska</span></div>
      </div>
    </footer>
  );
}
