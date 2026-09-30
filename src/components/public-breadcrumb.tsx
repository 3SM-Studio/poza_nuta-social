import Link from "next/link";
import { publicPage } from "@/lib/public-paths";

export function PublicBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Ścieżka" className="ed-breadcrumb ed-meta">
      <Link href={publicPage.home}>Poza Nutą</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}
