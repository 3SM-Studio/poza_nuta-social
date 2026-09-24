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
      <article className="typeset typeset-legal mt-10">
        <header><h1>{heading}</h1><p>{intro}</p></header>
        {children}
      </article>
    </main>
  );
}
