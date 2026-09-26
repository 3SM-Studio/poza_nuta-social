import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { PrivacySettingsControl } from "@/components/consent-controls";
import { getPublicDestinations } from "@/lib/destinations";
import { publicNavigation } from "@/lib/public-navigation";
import { publicPage } from "@/lib/public-paths";

const footerLink = "inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-accent";

export async function PublicFooter() {
  const destinations = await getPublicDestinations();
  return (
    <footer className="mt-auto border-t border-accent text-foreground">
      <div className="mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 py-14 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-20 lg:py-20">
          <div className="flex flex-col items-start justify-between gap-8">
            <Link href={publicPage.home} aria-label="Poza Nutą - strona główna" className="inline-flex text-foreground transition-colors hover:text-accent"><BrandLogo className="size-24 lg:size-32" /></Link>
            <p className="font-display max-w-lg text-[clamp(2.8rem,5vw,5.5rem)] leading-[0.9]">Karaoke i wydarzenia muzyczne <span className="text-accent">w Trójmieście.</span></p>
          </div>
          <div className="grid min-w-0 gap-8 xl:grid-cols-2">
            <div>
              <h2 className="border-b border-border pb-3 text-xs font-bold uppercase tracking-[0.16em] text-foreground">Odkryj</h2>
              <nav aria-label="Nawigacja w stopce" className="mt-3 flex flex-col items-start">
                {publicNavigation.map(({ href, label }) => <Link key={href} href={href} className={footerLink}>{label}</Link>)}
              </nav>
            </div>
            <div>
              <h2 className="border-b border-border pb-3 text-xs font-bold uppercase tracking-[0.16em] text-foreground">Oficjalne kanały</h2>
              {destinations.length ? (
                <ul className="mt-3">{destinations.map(({ slug, label }) => <li key={slug}><Link href={`/go/${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer" className={footerLink} aria-label={`Otwórz ${label} w nowej karcie`}>{label}<ArrowUpRight className="size-3.5" aria-hidden="true" /></Link></li>)}</ul>
              ) : <p className="mt-4 text-sm leading-6 text-muted-foreground">Kanały są właśnie konfigurowane.</p>}
              <h2 className="mt-7 border-b border-border pb-3 text-xs font-bold uppercase tracking-[0.16em] text-foreground">Twoja prywatność</h2>
              <div className="mt-3 flex flex-col items-start">
                <Link href={publicPage.privacy} className={footerLink}>Prywatność</Link>
                <Link href={publicPage.cookies} className={footerLink}>Cookies</Link>
                <PrivacySettingsControl />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-5 text-xs text-muted-foreground"><span>© {new Date().getFullYear()} Poza Nutą</span><span>Trójmiasto</span></div>
      </div>
    </footer>
  );
}
