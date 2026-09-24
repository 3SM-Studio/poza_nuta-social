"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { announceAnalyticsChoice } from "@/lib/analytics-client";

export function ConsentBanner() {
  const pathname = usePathname();
  const [consentMissing, setConsentMissing] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bannerRef = useRef<HTMLElement>(null);
  const [bannerSpace, setBannerSpace] = useState(0);
  const publicRoute = !pathname.startsWith("/admin") && !pathname.startsWith("/auth");
  const visible = consentMissing === true && publicRoute && pathname !== "/privacy" && pathname !== "/cookies";
  useEffect(() => {
    if (!publicRoute) return;
    let active = true;
    const sync = () => fetch("/api/consent", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("consent-unavailable");
        return response.json() as Promise<{ choice: { analytics: boolean } | null }>;
      })
      .then((result) => { if (active) setConsentMissing(result.choice === null); })
      .catch(() => { if (active) setConsentMissing(true); });
    void sync();
    window.addEventListener("pn-consent-changed", sync);
    return () => { active = false; window.removeEventListener("pn-consent-changed", sync); };
  }, [pathname, publicRoute]);
  useEffect(() => {
    const banner = bannerRef.current;
    if (!visible || !banner) return;
    const observer = new ResizeObserver(() => {
      const bottom = Number.parseFloat(getComputedStyle(banner).bottom) || 0;
      setBannerSpace(Math.ceil(banner.getBoundingClientRect().height + bottom * 2));
    });
    observer.observe(banner);
    return () => observer.disconnect();
  }, [visible]);
  useEffect(() => {
    document.body.style.paddingBottom = visible ? `${bannerSpace}px` : consentMissing === false && publicRoute ? "3.5rem" : "";
    return () => { document.body.style.paddingBottom = ""; };
  }, [visible, bannerSpace, consentMissing, publicRoute]);
  async function choose(analytics: boolean) {
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analytics, marketing: false }) });
      if (response.ok) {
        setConsentMissing(false);
        announceAnalyticsChoice(analytics);
        window.dispatchEvent(new Event("pn-consent-changed"));
      }
      else setError(true);
    } catch { setError(true); }
    finally { setPending(false); }
  }
  if (!publicRoute) return null;
  return (
    <>
      {visible ? <>
        <aside ref={bannerRef} className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[calc(100svh-2.5rem)] max-w-2xl overflow-y-auto rounded-xl border bg-background p-4 shadow-xl sm:bottom-5 sm:p-5" aria-label="Wybór analityki">
          <p className="text-sm font-bold">Twoja prywatność</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Za Twoją zgodą mierzymy odwiedziny i wybór oficjalnych linków. Możesz odmówić bez utraty dostępu do strony. Wybór zmienisz w każdej chwili.{" "}<Link href="/cookies" className="font-bold text-foreground underline underline-offset-4">O cookies</Link></p>
          {error ? <p role="alert" className="mt-2 text-sm text-destructive">Nie udało się zapisać wyboru. Spróbuj ponownie.</p> : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={pending} onClick={() => choose(false)}>Odrzuć analitykę</Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => choose(true)}>Zgadzam się na analitykę</Button>
          </div>
        </aside>
      </> : null}
      {consentMissing === false ? <>
        <Button type="button" variant="secondary" aria-label="Ustawienia prywatności" className="fixed bottom-3 left-3 z-40 h-11 px-3 text-xs shadow-lg sm:bottom-5 sm:left-5 sm:px-4 sm:text-sm" onClick={() => setSettingsOpen(true)}><Cookie className="size-4" aria-hidden="true" /><span className="sm:hidden">Prywatność</span><span className="hidden sm:inline">Ustawienia prywatności</span></Button>
      </> : null}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Ustawienia prywatności</DialogTitle><DialogDescription>Wybierz, czy Poza Nutą może mierzyć korzystanie ze strony. Odmowa nie ogranicza dostępu.</DialogDescription></DialogHeader>
          <div className="space-y-3 border-y py-4 text-sm">
            <div><p className="font-bold">Niezbędne <span className="font-normal text-muted-foreground">· zawsze aktywne</span></p><p className="text-muted-foreground">Działanie strony i zapamiętanie wyboru.</p></div>
            <div><p className="font-bold">Analityka <span className="font-normal text-muted-foreground">· Twój wybór</span></p><p className="text-muted-foreground">Pomiar odwiedzin, źródeł wejścia i wyboru oficjalnych linków.</p></div>
          </div>
          <ConsentPreferences onSaved={() => setSettingsOpen(false)} />
          <Link href="/cookies" onClick={() => setSettingsOpen(false)} className="text-sm font-bold underline underline-offset-4">Jakich cookies używamy?</Link>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConsentPreferences({ onSaved }: { onSaved?: () => void } = {}) {
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
      const response = await fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analytics }) });
      if (!response.ok) throw new Error("consent-unavailable");
      setChoice(analytics);
      announceAnalyticsChoice(analytics);
      window.dispatchEvent(new Event("pn-consent-changed"));
      onSaved?.();
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
        <Button type="button" variant="outline" aria-pressed={choice === false} disabled={loading || pending} onClick={() => choose(false)}>Tylko niezbędne</Button>
        <Button type="button" variant="outline" aria-pressed={choice === true} disabled={loading || pending} onClick={() => choose(true)}>Włącz analitykę</Button>
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
