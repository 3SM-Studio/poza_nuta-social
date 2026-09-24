"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { announceAnalyticsChoice } from "@/lib/analytics-client";
import { publicPage } from "@/lib/public-paths";

export function ConsentBanner() {
  const pathname = usePathname();
  const [consentMissing, setConsentMissing] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bannerRef = useRef<HTMLElement>(null);
  const focusAfterChoiceRef = useRef(false);
  const [bannerSpace, setBannerSpace] = useState(0);
  const publicRoute = !pathname.startsWith("/admin") && !pathname.startsWith("/auth");
  const visible = consentMissing === true && publicRoute && pathname !== publicPage.privacy && pathname !== publicPage.cookies;
  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener("pn-open-privacy-settings", open);
    return () => window.removeEventListener("pn-open-privacy-settings", open);
  }, []);
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
    const clearance = visible ? `${bannerSpace}px` : "";
    document.body.style.paddingBottom = clearance;
    document.documentElement.style.scrollPaddingBottom = clearance;
    return () => { document.body.style.paddingBottom = ""; document.documentElement.style.scrollPaddingBottom = ""; };
  }, [visible, bannerSpace, consentMissing, publicRoute]);
  useEffect(() => {
    if (consentMissing === false && focusAfterChoiceRef.current) {
      document.querySelector<HTMLAnchorElement>('a[href="#main-content"]')?.focus();
      focusAfterChoiceRef.current = false;
    }
  }, [consentMissing]);
  async function choose(analytics: boolean) {
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analytics, marketing: false }) });
      if (response.ok) {
        focusAfterChoiceRef.current = true;
        setStatusMessage(analytics ? "Analityka została włączona." : "Analityka została wyłączona.");
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
      <p role="status" className="sr-only">{statusMessage}</p>
      {visible ? <>
        <aside ref={bannerRef} className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[calc(100svh-2.5rem)] max-w-2xl overflow-y-auto rounded-xl border bg-background p-4 shadow-xl sm:bottom-5 sm:p-5" aria-label="Wybór analityki">
          <p className="text-sm font-bold">Twoja prywatność</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Za Twoją zgodą mierzymy odwiedziny i wybór oficjalnych linków. Możesz odmówić bez utraty dostępu do strony. Wybór zmienisz w każdej chwili.{" "}<Link href={publicPage.privacy} className="font-bold text-foreground underline underline-offset-4">O prywatności</Link>{" · "}<Link href={publicPage.cookies} className="font-bold text-foreground underline underline-offset-4">O cookies</Link></p>
          {error ? <p role="alert" className="mt-2 text-sm text-destructive">Nie udało się zapisać wyboru. Spróbuj ponownie.</p> : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={pending} onClick={() => choose(false)}>Odrzuć analitykę</Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => choose(true)}>Zgadzam się na analitykę</Button>
          </div>
        </aside>
      </> : null}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md" finalFocus={() => document.querySelector<HTMLButtonElement>("[data-privacy-settings-trigger]")}>
          <DialogHeader><DialogTitle>Ustawienia prywatności</DialogTitle><DialogDescription>Wybierz, czy Poza Nutą może mierzyć korzystanie ze strony. Odmowa nie ogranicza dostępu.</DialogDescription></DialogHeader>
          <div className="space-y-3 border-y py-4 text-sm">
            <div><p className="font-bold">Niezbędne <span className="font-normal text-muted-foreground">· zawsze aktywne</span></p><p className="text-muted-foreground">Działanie strony i zapamiętanie wyboru.</p></div>
            <div><p className="font-bold">Analityka <span className="font-normal text-muted-foreground">· Twój wybór</span></p><p className="text-muted-foreground">Pomiar odwiedzin, źródeł wejścia i wyboru oficjalnych linków.</p></div>
          </div>
          <ConsentPreferences onSaved={(analytics) => { setStatusMessage(analytics ? "Analityka została włączona." : "Analityka została wyłączona."); setSettingsOpen(false); }} />
          <Link href={publicPage.privacy} onClick={() => setSettingsOpen(false)} className="text-sm font-bold underline underline-offset-4">Informacje o prywatności</Link>
          <Link href={publicPage.cookies} onClick={() => setSettingsOpen(false)} className="text-sm font-bold underline underline-offset-4">Jakich cookies używamy?</Link>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConsentPreferences({ onSaved }: { onSaved?: (analytics: boolean) => void } = {}) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"read" | "save" | null>(null);
  const retryChoiceRef = useRef<boolean | null>(null);
  const essentialButtonRef = useRef<HTMLButtonElement>(null);
  const analyticsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (error === "save" && !pending) {
      (retryChoiceRef.current ? analyticsButtonRef : essentialButtonRef).current?.focus();
    }
  }, [error, pending]);

  useEffect(() => {
    let active = true;
    const sync = () => readConsentChoice()
      .then((value) => { if (active) setChoice(value); })
      .catch(() => { if (active) setError("read"); })
      .finally(() => { if (active) setLoading(false); });
    void sync();
    window.addEventListener("pn-consent-changed", sync);
    return () => { active = false; window.removeEventListener("pn-consent-changed", sync); };
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try { setChoice(await readConsentChoice()); }
    catch { setError("read"); }
    finally { setLoading(false); }
  }

  async function choose(analytics: boolean) {
    retryChoiceRef.current = analytics;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analytics }) });
      if (!response.ok) throw new Error("consent-unavailable");
      setChoice(analytics);
      announceAnalyticsChoice(analytics);
      window.dispatchEvent(new Event("pn-consent-changed"));
      onSaved?.(analytics);
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
        <Button ref={essentialButtonRef} type="button" variant="outline" aria-pressed={choice === false} disabled={loading || pending} onClick={() => choose(false)}>Tylko niezbędne</Button>
        <Button ref={analyticsButtonRef} type="button" variant="outline" aria-pressed={choice === true} disabled={loading || pending} onClick={() => choose(true)}>Włącz analitykę</Button>
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

export function PrivacySettingsControl() {
  return <Button type="button" variant="secondary" data-privacy-settings-trigger aria-label="Ustawienia prywatności" className="h-11 px-3 text-xs sm:px-4 sm:text-sm" onClick={() => window.dispatchEvent(new Event("pn-open-privacy-settings"))}><Cookie className="size-4" aria-hidden="true" /><span className="sm:hidden">Prywatność</span><span className="hidden sm:inline">Ustawienia prywatności</span></Button>;
}
