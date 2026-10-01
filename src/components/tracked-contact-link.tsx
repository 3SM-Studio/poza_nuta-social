"use client";

import { ArrowUpRight } from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function TrackedContactLink({ email, className, textClassName }: { email: string; className?: string; textClassName?: string }) {
  return (
    <a
      href={`mailto:${email}`}
      onClick={() => track("contact_click", { contactType: "email" })}
      className={cn("ed-contact-link", className)}
    >
      <span className={textClassName}>{email}</span>
      <ArrowUpRight aria-hidden="true" />
    </a>
  );
}
