"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { publicNavigation } from "@/lib/public-navigation";
import { publicPage } from "@/lib/public-paths";

export function PublicHeader({ fontClassName }: { fontClassName: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  function setMenuOpen(next: boolean) {
    setOpen(next);
    if (!next) window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  return (
    <header className="ed-header">
      <div className="ed-header__strap" aria-hidden="true">
        <div className="ed-header__strap-inner ed-shell ed-meta"><span>Poza Nutą / Trójmiasto</span><span>Karaoke i wydarzenia muzyczne</span></div>
      </div>
      <div className="ed-header__main ed-shell">
        <Link href={publicPage.home} aria-label="Poza Nutą — strona główna" className="ed-header__brand">
          <BrandLogo className="ed-header__mark" />
        </Link>
        <nav aria-label="Nawigacja główna" className="ed-header__nav">
          {publicNavigation.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className="ed-header__link">
              {label}
              {href === publicPage.contact ? <ArrowUpRight aria-hidden="true" /> : null}
            </Link>
          ))}
        </nav>
        <Sheet open={open} onOpenChange={setMenuOpen}>
          <SheetTrigger render={<Button ref={triggerRef} variant="outline" className="ed-header__menu-button" aria-label="Otwórz menu" />}>
            <span>Menu</span><Menu aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="right" showCloseButton={false} className={`${fontClassName} ed-menu-sheet`}>
            <SheetHeader className="ed-menu-sheet__header">
              <SheetTitle className="ed-serif ed-menu-sheet__title">Menu</SheetTitle>
              <SheetClose render={<Button variant="ghost" className="ed-menu-sheet__close" aria-label="Zamknij menu" />}><X aria-hidden="true" /></SheetClose>
            </SheetHeader>
            <nav aria-label="Nawigacja główna" className="ed-menu-sheet__nav">
              {publicNavigation.map(({ href, label }) => (
                <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setMenuOpen(false)} className="ed-menu-sheet__link">
                  <span>{label}</span><ArrowUpRight aria-hidden="true" />
                </Link>
              ))}
            </nav>
            <p className="ed-meta ed-menu-sheet__note">Karaoke i wydarzenia muzyczne / Trójmiasto</p>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
