"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-5 text-center"><p className="text-xs font-black uppercase tracking-[0.16em] text-accent">Poza Nutą</p><h1 className="mt-3 text-4xl font-black tracking-tight">Coś nie zagrało.</h1><p className="mt-3 text-sm text-muted-foreground">Możesz spróbować jeszcze raz albo wrócić na stronę główną.</p><div className="mt-7 flex justify-center gap-2"><Button onClick={reset}>Spróbuj ponownie</Button><Link className={buttonVariants({ variant: "outline" })} href="/">Strona główna</Link></div></main>;
}
