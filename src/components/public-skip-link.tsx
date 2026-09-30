"use client";

import { usePathname } from "next/navigation";

export function PublicSkipLink() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;
  return <a href="#main-content" className="fixed left-4 top-4 z-[60] -translate-y-24 rounded-md bg-accent px-4 py-3 font-bold text-accent-foreground focus:translate-y-0">Przejdź do treści</a>;
}
