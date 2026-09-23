"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

export function SubmitButton({ idle, pending, variant, size, className }: { idle: string; pending: string; variant?: ComponentProps<typeof Button>["variant"]; size?: ComponentProps<typeof Button>["size"]; className?: string }) {
  const status = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={status.pending} aria-disabled={status.pending}>
      {status.pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {status.pending ? pending : idle}
    </Button>
  );
}
