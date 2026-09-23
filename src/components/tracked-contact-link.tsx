"use client";

import { Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { sendAnalyticsEvent } from "@/lib/analytics-client";
import { cn } from "cn";

export function TrackedContactLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} onClick={() => sendAnalyticsEvent("contact_click", { contactType: "email" })} className={cn(buttonVariants({ variant: "accent", size: "xl" }), "mt-8 w-full justify-between")}>
      <span className="flex items-center gap-3"><Mail className="size-5" aria-hidden="true" /><span>{email}</span></span>
      <span aria-hidden="true">→</span>
    </a>
  );
}
