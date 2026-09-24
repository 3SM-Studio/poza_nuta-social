"use client";

import { useRef, useState } from "react";
import Link from "next/link";
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

  return (
    <header className="flex min-h-20 items-center justify-between gap-5 border-b py-2 sm:min-h-24 lg:grid lg:grid-cols-[1fr_auto_1fr]">
      <Link href={publicPage.home} aria-label="Poza Nutą - strona główna" className="inline-flex min-h-12 items-center text-foreground transition-colors hover:text-accent">
        <BrandLogo className="size-16 sm:size-[4.5rem]" />
      </Link>
      <nav aria-label="Nawigacja główna" className="hidden items-center gap-6 text-sm font-bold lg:flex">
        {publicNavigation.map(({ href, label }) => (
          <Link key={href} href={href} className="inline-flex min-h-11 items-center text-muted-foreground transition-colors hover:text-foreground">{label}</Link>
        ))}
      </nav>
      <Link href={publicPage.karaoke} className={cn(buttonVariants({ variant: "accent", size: "lg" }), "hidden lg:inline-flex lg:justify-self-end")}>
        Chcę zaśpiewać <ArrowUpRight aria-hidden="true" />
      </Link>
      <Sheet open={open} onOpenChange={(next) => {
        setOpen(next);
        if (!next) window.setTimeout(() => triggerRef.current?.focus(), 0);
      }}>
        <SheetTrigger render={<Button ref={triggerRef} variant="outline" size="lg" className="min-w-11 lg:hidden" aria-label="Otwórz menu" />}>
          <Menu aria-hidden="true" /> Menu
        </SheetTrigger>
        <SheetContent side="right" className="w-[min(22rem,calc(100vw-1rem))] gap-0 border-border bg-background p-6" showCloseButton={false}>
          <SheetHeader className="flex-row items-center justify-between border-b px-0 pb-5 pt-0">
            <SheetTitle className="font-display text-3xl leading-none">Poza Nutą</SheetTitle>
            <SheetClose render={<Button variant="ghost" size="lg" aria-label="Zamknij menu" />}>Zamknij</SheetClose>
          </SheetHeader>
          <nav aria-label="Nawigacja główna" className="flex flex-col py-5">
            {publicNavigation.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="flex min-h-14 items-center border-b text-xl font-bold text-foreground hover:text-accent">{label}</Link>
            ))}
          </nav>
          <Link href={publicPage.karaoke} onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "accent", size: "lg" }), "mt-5 w-full justify-between")}>
            Chcę zaśpiewać <ArrowUpRight aria-hidden="true" />
          </Link>
        </SheetContent>
      </Sheet>
    </header>
  );
}
