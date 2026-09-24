import Link from "next/link";

const navigation = [
  { href: "/karaoke-trojmiasto", label: "Karaoke" },
  { href: "/dla-lokali", label: "Dla lokali" },
  { href: "/linki", label: "Linki" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export function PublicHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-8 border-b pb-3 sm:pb-4">
      <Link href="/" aria-label="Poza Nutą — strona główna" className="font-display inline-flex min-h-11 items-center text-[1.9rem] leading-none tracking-[-0.02em] text-foreground hover:text-accent">
        POZA NUTĄ
      </Link>
      <nav aria-label="Nawigacja główna" className="flex w-full flex-wrap items-center gap-x-5 gap-y-0 text-sm font-bold sm:w-auto">
        {navigation.map(({ href, label }) => (
          <Link key={href} href={href} className="inline-flex min-h-11 items-center text-muted-foreground transition-colors hover:text-accent">
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
