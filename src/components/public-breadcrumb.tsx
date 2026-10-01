import Link from "next/link";
import { publicPage } from "@/lib/public-paths";
import { cn } from "@/lib/utils";

export function PublicBreadcrumb({ current, className }: { current: string; className?: string }) {
  return (
    <nav aria-label="Ścieżka" className={cn("ed-breadcrumb ed-meta", className)}>
      <Link href={publicPage.home}>Poza Nutą</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}
