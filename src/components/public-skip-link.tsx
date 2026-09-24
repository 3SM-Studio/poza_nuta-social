"use client";

import { usePathname } from "next/navigation";

export function PublicSkipLink() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;
  return <a href="#main-content" className="sr-only fixed left-4 top-4 z-[60] rounded-md bg-accent px-4 py-3 font-bold text-accent-foreground focus:not-sr-only">Przejdź do treści</a>;
}
