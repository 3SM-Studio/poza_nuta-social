"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "cn";
import { publicNavigation } from "@/lib/public-navigation";
import { publicPage } from "@/lib/public-paths";

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const venuePage = pathname === publicPage.venues;
  const karaokePage = pathname === publicPage.karaoke;

  return (
    <header className="border-b border-border/80 text-foreground">
      <div className="mx-auto flex min-h-20 w-full max-w-[96rem] items-center justify-between gap-6 px-5 sm:px-8 lg:min-h-24 lg:px-12">
        <Link href={publicPage.home} aria-label="Poza Nutą - strona główna" className="inline-flex min-h-14 items-center text-foreground transition-colors hover:text-accent">
          <BrandLogo className="size-14 lg:size-16" />
        </Link>
        <span className="hidden text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground md:block">Karaoke i muzyka <span className="mx-2 text-accent">/</span> Trójmiasto</span>
        <nav aria-label="Nawigacja główna" className="hidden items-center gap-8 lg:flex">
          {publicNavigation.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className="inline-flex min-h-11 items-center border-b-2 border-transparent text-sm font-bold transition-colors hover:text-accent aria-[current=page]:border-accent aria-[current=page]:text-foreground">{label}</Link>
          ))}
        </nav>
        <Sheet open={open} onOpenChange={(next) => {
          setOpen(next);
          if (!next) window.setTimeout(() => triggerRef.current?.focus(), 0);
        }}>
          <SheetTrigger render={<Button ref={triggerRef} variant="outline" size="lg" className="min-w-11 rounded-none border-border lg:hidden" aria-label="Otwórz menu" />}>
            <Menu aria-hidden="true" /> Menu
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(23rem,calc(100vw-1rem))] gap-0 rounded-none border-l border-accent bg-background p-6" showCloseButton={false}>
            <SheetHeader className="flex-row items-center justify-between border-b border-border px-0 pb-5 pt-0">
              <SheetTitle className="font-display text-4xl leading-none">Poza Nutą</SheetTitle>
              <SheetClose render={<Button variant="ghost" size="lg" aria-label="Zamknij menu" />}>Zamknij</SheetClose>
            </SheetHeader>
            <nav aria-label="Nawigacja główna" className="flex flex-col py-5">
              {publicNavigation.map(({ href, label }) => (
                <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)} className="flex min-h-16 items-center justify-between border-b border-border text-2xl font-bold transition-colors hover:text-accent aria-[current=page]:text-accent">{label}<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
              ))}
            </nav>
            <Link href={venuePage ? publicPage.contact : karaokePage ? publicPage.links : publicPage.karaoke} onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "accent", size: "lg" }), "mt-5 w-full justify-between rounded-none")}>
              {venuePage ? "Kontakt / współpraca" : karaokePage ? "Oficjalne kanały" : "Informacje o karaoke"}<ArrowUpRight aria-hidden="true" />
            </Link>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
