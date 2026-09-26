"use client";

import { ArrowUpRight } from "lucide-react";
import { track } from "@/lib/analytics";

export function TrackedContactLink({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      onClick={() => track("contact_click", { contactType: "email" })}
      className="group flex min-h-24 min-w-0 items-center justify-between gap-4 border-b border-border py-5 text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-h-32"
    >
      <span className="min-w-0 break-all text-[clamp(1.7rem,4.7vw,4.5rem)] font-semibold leading-none tracking-[-0.04em] [overflow-wrap:anywhere]">{email}</span>
      <ArrowUpRight className="size-6 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 sm:size-8" aria-hidden="true" />
    </a>
  );
}
