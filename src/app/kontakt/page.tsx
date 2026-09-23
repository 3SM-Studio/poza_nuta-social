import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getContactEmail } from "@/lib/env";
import { cn } from "cn";
import { TrackPageView } from "@/components/track-page-view";
import { TrackedContactLink } from "@/components/tracked-contact-link";

export const metadata: Metadata = {
  title: "Kontakt i współpraca",
  description: "Kontakt z Poza Nutą w sprawie współpracy, wydarzeń i karaoke w Trójmieście.",
  alternates: { canonical: "/kontakt" },
};

export default function ContactPage() {
  const email = getContactEmail();
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col px-5 py-7 sm:px-7 sm:py-10">
      <TrackPageView contact />
      <div className="flex-1 py-10">
        <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 mb-8")}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Wróć
        </Link>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-accent">Poza Nutą · Trójmiasto</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Kontakt / współpraca</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
          Chcesz zorganizować karaoke, zaprosić Poza Nutą do lokalu albo porozmawiać o współpracy? Napisz do nas oficjalnym kanałem.
        </p>

        {email ? (
          <TrackedContactLink email={email} />
        ) : (
          <div className="mt-8 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            Oficjalny adres kontaktowy jest właśnie konfigurowany. Skorzystaj na razie z jednego z oficjalnych profili na stronie głównej.
          </div>
        )}
      </div>
      <footer className="border-t py-5 text-xs text-muted-foreground">© {new Date().getFullYear()} Poza Nutą</footer>
    </main>
  );
}
