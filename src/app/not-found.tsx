import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-5 py-10 text-center">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-4 text-5xl font-black tracking-tight">Tu nic nie gra.</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Ten link nie istnieje albo został wyłączony.</p>
      <Link href="/" className={`${buttonVariants({ variant: "accent", size: "lg" })} mx-auto mt-8`}>
        Wróć do Poza Nutą
      </Link>
    </main>
  );
}
