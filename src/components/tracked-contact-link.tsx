"use client";

import { ArrowUpRight } from "lucide-react";
import { track } from "@/lib/analytics";

export function TrackedContactLink({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      onClick={() => track("contact_click", { contactType: "email" })}
      className="ed-contact-link"
    >
      <span>{email}</span>
      <ArrowUpRight aria-hidden="true" />
    </a>
  );
}
