"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DebugRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button type="button" variant="outline" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
    <RefreshCw aria-hidden="true" className={pending ? "animate-spin" : ""} />
    {pending ? "Odświeżanie…" : "Odśwież"}
  </Button>;
}
