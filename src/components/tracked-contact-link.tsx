"use client";

import { Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { cn } from "cn";

export function TrackedContactLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} onClick={() => track("contact_click", { contactType: "email" })} className={cn(buttonVariants({ variant: "accent", size: "xl" }), "mt-8 w-full min-w-0 justify-between whitespace-normal text-left")}>
      <span className="flex min-w-0 items-center gap-3"><Mail className="size-5 shrink-0" aria-hidden="true" /><span className="min-w-0 break-all">{email}</span></span>
      <span className="shrink-0" aria-hidden="true">→</span>
    </a>
  );
}
