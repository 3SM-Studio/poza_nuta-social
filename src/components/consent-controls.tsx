"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ConsentBanner() {
  const pathname = usePathname();
  const [consentMissing, setConsentMissing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname === "/privacy") return;
    let active = true;
    fetch("/api/consent", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("consent-unavailable");
        return response.json() as Promise<{ choice: { analytics: boolean } | null }>;
      })
      .then((result) => { if (active) setConsentMissing(result.choice === null); })
      .catch(() => { if (active) setConsentMissing(true); });
    return () => { active = false; };
  }, [pathname]);
  if (!consentMissing || pathname.startsWith("/admin") || pathname === "/privacy") return null;
  async function choose(analytics: boolean) {
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analytics, marketing: false }) });
      if (response.ok) {
        setConsentMissing(false);
        window.dispatchEvent(new Event("pn-consent-changed"));
      }
      else setError(true);
    } catch { setError(true); }
    finally { setPending(false); }
  }
  return (
    <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-xl border bg-background p-4 shadow-xl sm:bottom-5 sm:p-5" aria-label="Ustawienia prywatności">
      <p className="text-sm font-bold">Prywatność i pomiar</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Krótka sesja utrzymuje spójność wejścia. Za zgodą możemy rozpoznać powrót tej samej przeglądarki. Nie tworzymy odcisku urządzenia ani nie zapisujemy surowego adresu IP.{" "}<Link href="/privacy" className="font-bold text-foreground underline underline-offset-4">Szczegóły</Link></p>
      {error ? <p role="alert" className="mt-2 text-sm text-destructive">Nie udało się zapisać wyboru. Spróbuj ponownie.</p> : null}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={pending} onClick={() => choose(false)}>Tylko niezbędne</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => choose(true)}>Zgadzam się na analitykę</Button>
      </div>
    </aside>
  );
}

export function ConsentPreferences() {
  const [choice, setChoice] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"read" | "save" | null>(null);

  useEffect(() => {
    let active = true;
    readConsentChoice()
      .then((value) => { if (active) setChoice(value); })
      .catch(() => { if (active) setError("read"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try { setChoice(await readConsentChoice()); }
    catch { setError("read"); }
    finally { setLoading(false); }
  }

  async function choose(analytics: boolean) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analytics, marketing: false }) });
      if (!response.ok) throw new Error("consent-unavailable");
      setChoice(analytics);
      window.dispatchEvent(new Event("pn-consent-changed"));
    } catch { setError("save"); }
    finally { setPending(false); }
  }

  return (
    <div className="space-y-3">
      <p role="status" className="font-medium text-foreground">
        {loading ? "Sprawdzamy aktualne ustawienie…" : error === "read" ? "Nie udało się sprawdzić aktualnego ustawienia." : choice === null ? "Nie wybrano jeszcze ustawienia analityki." : choice ? "Analityka włączona dla tej przeglądarki." : "Analityka wyłączona dla tej przeglądarki."}
      </p>
      {error === "read" ? <Button type="button" variant="outline" disabled={loading} onClick={() => void refresh()}>Sprawdź ponownie</Button> : null}
      {error === "save" ? <p role="alert" className="text-destructive">Nie udało się zapisać ustawienia. Spróbuj ponownie.</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant={choice === false ? "secondary" : "outline"} disabled={loading || pending} onClick={() => choose(false)}>Tylko niezbędne</Button>
        <Button type="button" variant={choice === true ? "secondary" : "accent"} disabled={loading || pending} onClick={() => choose(true)}>Włącz analitykę</Button>
      </div>
    </div>
  );
}

async function readConsentChoice() {
  const response = await fetch("/api/consent", { cache: "no-store" });
  if (!response.ok) throw new Error("consent-unavailable");
  const result = await response.json() as { choice: { analytics: boolean } | null };
  return result.choice?.analytics ?? null;
}
