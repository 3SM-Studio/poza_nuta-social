"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ConsentBanner() {
  const pathname = usePathname();
  const consentMissing = useSyncExternalStore(subscribe, () => !document.cookie.split("; ").some((row) => row.startsWith("pn_consent=")), () => false);
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  if (!consentMissing || dismissed || pathname.startsWith("/admin")) return null;
  async function choose(analytics: boolean) {
    setPending(true);
    const response = await fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analytics, marketing: false }) });
    if (response.ok) setDismissed(true);
    setPending(false);
  }
  return (
    <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-xl border bg-background p-4 shadow-xl sm:bottom-5 sm:p-5" aria-label="Ustawienia prywatności">
      <p className="text-sm font-bold">Prywatność i pomiar</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Niezbędna, krótka sesja utrzymuje spójność wejścia. Za zgodą możemy rozpoznać powrót tej samej przeglądarki. Bez fingerprintingu i surowych IP.{" "}<Link href="/privacy" className="font-bold text-foreground underline underline-offset-4">Szczegóły</Link></p>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" disabled={pending} onClick={() => choose(false)}>Tylko niezbędne</Button>
        <Button type="button" variant="accent" disabled={pending} onClick={() => choose(true)}>Zgadzam się na analitykę</Button>
      </div>
    </aside>
  );
}

function subscribe() { return () => undefined; }

export function ConsentReset() {
  const [status, setStatus] = useState<string | null>(null);
  async function withdraw() {
    const response = await fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analytics: false, marketing: false }) });
    setStatus(response.ok ? "Zgoda analityczna została wycofana dla kolejnych zdarzeń." : "Nie udało się zapisać ustawienia.");
  }
  return <div><Button type="button" variant="outline" onClick={withdraw}>Wycofaj zgodę analityczną</Button>{status ? <p className="mt-2 text-xs text-muted-foreground" role="status">{status}</p> : null}</div>;
}
