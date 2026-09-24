import Link from "next/link";
import { publicPage } from "@/lib/public-paths";

export function PublicBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Ścieżka" className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
      <Link href={publicPage.home} className="inline-flex min-h-11 items-center font-bold text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Poza Nutą</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}
