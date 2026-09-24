import type { ReactNode } from "react";
import { PublicBreadcrumb } from "@/components/public-breadcrumb";

export function LegalPage({ title, heading, intro, children }: {
  title: string;
  heading: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-2xl flex-1">
      <PublicBreadcrumb current={title} />
      <article className="mt-10 space-y-9 text-sm leading-7">
        <header><h1 className="text-4xl font-black tracking-tight sm:text-5xl">{heading}</h1><p className="mt-4 text-muted-foreground">{intro}</p></header>
        {children}
      </article>
    </main>
  );
}
