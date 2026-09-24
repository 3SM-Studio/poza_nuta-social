import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-8 border-t py-5 text-xs text-muted-foreground">
      <span>© {new Date().getFullYear()} Poza Nutą</span>
      <div className="flex flex-wrap items-center gap-x-5">
        <Link href="/linki" className="inline-flex min-h-11 items-center font-bold text-foreground underline-offset-4 hover:underline">Oficjalne linki</Link>
        <Link href="/kontakt" className="inline-flex min-h-11 items-center font-bold text-foreground underline-offset-4 hover:underline">Kontakt</Link>
        <Link href="/privacy" className="inline-flex min-h-11 items-center font-bold text-foreground underline-offset-4 hover:underline">Prywatność</Link>
      </div>
    </footer>
  );
}
