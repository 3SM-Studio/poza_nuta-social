import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { PrivacySettingsControl } from "@/components/consent-controls";
import { getPublicDestinations } from "@/lib/destinations";

const navigation = [
  { href: "/karaoke-trojmiasto", label: "Karaoke" },
  { href: "/dla-lokali", label: "Dla lokali" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/linki", label: "Linki" },
] as const;

const footerLink = "inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground";

export async function PublicFooter() {
  const destinations = await getPublicDestinations();
  return (
    <footer className="border-t pt-12 text-foreground sm:pt-16">
      <div className="grid gap-12 pb-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))] lg:gap-8 lg:pb-20">
        <div className="max-w-xs">
          <Link href="/" aria-label="Poza Nutą - strona główna" className="inline-flex text-foreground hover:text-accent"><BrandLogo className="size-24" /></Link>
          <p className="mt-4 text-base leading-7 text-muted-foreground">Karaoke i wydarzenia muzyczne w Trójmieście.</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold text-foreground">Odkryj</h2>
          <nav aria-label="Nawigacja w stopce" className="flex flex-col items-start">
            {navigation.map(({ href, label }) => <Link key={href} href={href} className={footerLink}>{label}</Link>)}
          </nav>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold text-foreground">Oficjalne kanały</h2>
          {destinations.length ? (
            <ul>{destinations.map(({ slug, label }) => <li key={slug}><Link href={`/go/${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer" className={footerLink} aria-label={`Otwórz ${label} w nowej karcie`}>{label}<ArrowUpRight className="size-3.5" aria-hidden="true" /></Link></li>)}</ul>
          ) : <p className="text-sm leading-6 text-muted-foreground">Kanały są właśnie konfigurowane.</p>}
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold text-foreground">Twoja prywatność</h2>
          <div className="flex flex-col items-start">
            <Link href="/privacy" className={footerLink}>Prywatność</Link>
            <Link href="/cookies" className={footerLink}>Cookies</Link>
            <PrivacySettingsControl />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t py-5 text-xs text-muted-foreground"><span>© {new Date().getFullYear()} Poza Nutą</span><span>Trójmiasto</span></div>
    </footer>
  );
}
