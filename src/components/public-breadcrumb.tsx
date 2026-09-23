import Link from "next/link";

export function PublicBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Ścieżka" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/" className="inline-flex min-h-11 items-center font-bold text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Poza Nutą</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}
