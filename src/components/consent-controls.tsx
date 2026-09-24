"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { chooseConsent, currentConsentState, listenForConsentChanges, readConsentState, type ConsentState } from "@/lib/consent-state";
import { publicPage } from "@/lib/public-paths";

export function ConsentBanner() {
  const pathname = usePathname();
  const [consentMissing, setConsentMissing] = useState<boolean | null>(null);
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
    const sync = () => {
      setConsentMissing(currentConsentState() === "unknown");
      void readConsentState().then((value) => { if (active) setConsentMissing(value === "unknown"); });
    };
    void sync();
    const stop = listenForConsentChanges(sync);
    return () => { active = false; stop(); };
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
  function choose(analytics: boolean) {
    focusAfterChoiceRef.current = true;
    chooseConsent(analytics);
    setStatusMessage(analytics ? "Wybór zapisany. Pełna analityka włączy się po potwierdzeniu serwera." : "Pełna analityka została wyłączona.");
    setConsentMissing(false);
  }
  if (!publicRoute) return null;
  return (
    <>
      <p role="status" className="sr-only">{statusMessage}</p>
      {visible ? <>
        <aside ref={bannerRef} className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[calc(100svh-2.5rem)] max-w-2xl overflow-y-auto rounded-xl border bg-background p-4 shadow-xl sm:bottom-5 sm:p-5" aria-label="Wybór analityki">
          <p className="text-sm font-bold">Twoja prywatność</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Bez zgody mierzymy ograniczone zdarzenia bez cookies analitycznych i bez łączenia wizyt. Za Twoją zgodą możemy mierzyć również sesje i powroty tej przeglądarki. Wybór zmienisz w każdej chwili.{" "}<Link href={publicPage.privacy} className="font-bold text-foreground underline underline-offset-4">O prywatności</Link>{" · "}<Link href={publicPage.cookies} className="font-bold text-foreground underline underline-offset-4">O cookies</Link></p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => choose(false)}>Odrzuć analitykę</Button>
            <Button type="button" variant="outline" onClick={() => choose(true)}>Zgadzam się na analitykę</Button>
          </div>
        </aside>
      </> : null}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md" finalFocus={() => document.querySelector<HTMLButtonElement>("[data-privacy-settings-trigger]")}>
          <DialogHeader><DialogTitle>Ustawienia prywatności</DialogTitle><DialogDescription>Wybierz, czy Poza Nutą może łączyć zdarzenia w sesje i rozpoznawać powroty tej przeglądarki. Odmowa nie ogranicza dostępu.</DialogDescription></DialogHeader>
          <div className="space-y-3 border-y py-4 text-sm">
            <div><p className="font-bold">Niezbędne <span className="font-normal text-muted-foreground">· zawsze aktywne</span></p><p className="text-muted-foreground">Działanie strony i zapamiętanie wyboru.</p></div>
            <div><p className="font-bold">Pełna analityka <span className="font-normal text-muted-foreground">· Twój wybór</span></p><p className="text-muted-foreground">Łączenie zdarzeń w sesje i rozpoznawanie powrotów tej przeglądarki.</p></div>
          </div>
          <ConsentPreferences onSaved={(analytics) => { setStatusMessage(analytics ? "Wybór zapisany. Pełna analityka włączy się po potwierdzeniu serwera." : "Pełna analityka została wyłączona."); setSettingsOpen(false); }} />
          <Link href={publicPage.privacy} onClick={() => setSettingsOpen(false)} className="text-sm font-bold underline underline-offset-4">Informacje o prywatności</Link>
          <Link href={publicPage.cookies} onClick={() => setSettingsOpen(false)} className="text-sm font-bold underline underline-offset-4">Jakich cookies używamy?</Link>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConsentPreferences({ onSaved }: { onSaved?: (analytics: boolean) => void } = {}) {
  const [choice, setChoice] = useState<ConsentState>("unknown");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const sync = () => {
      setChoice(currentConsentState());
      void readConsentState().then((value) => { if (active) { setChoice(value); setLoading(false); } });
    };
    void sync();
    const stop = listenForConsentChanges(sync);
    return () => { active = false; stop(); };
  }, []);

  function choose(analytics: boolean) {
    setChoice(chooseConsent(analytics));
    setLoading(false);
    onSaved?.(analytics);
  }

  return (
    <div className="space-y-3">
      <p role="status" className="font-medium text-foreground">
        {loading ? "Sprawdzamy aktualne ustawienie…" : choice === "unknown" ? "Nie wybrano jeszcze ustawienia pełnej analityki." : choice === "pending-accept" ? "Zgoda zapisana w tej przeglądarce. Pełna analityka pozostaje wyłączona do potwierdzenia serwera." : choice === "accepted" ? "Pełna analityka włączona dla tej przeglądarki." : "Pełna analityka wyłączona dla tej przeglądarki."}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" aria-pressed={choice === "rejected"} onClick={() => choose(false)}>Tylko niezbędne</Button>
        <Button type="button" variant="outline" aria-pressed={choice === "accepted" || choice === "pending-accept"} onClick={() => choose(true)}>Włącz analitykę</Button>
      </div>
    </div>
  );
}

export function PrivacySettingsControl() {
  return <Button type="button" variant="secondary" data-privacy-settings-trigger aria-label="Ustawienia prywatności" className="h-11 px-3 text-xs sm:px-4 sm:text-sm" onClick={() => window.dispatchEvent(new Event("pn-open-privacy-settings"))}><Cookie className="size-4" aria-hidden="true" /><span className="sm:hidden">Prywatność</span><span className="hidden sm:inline">Ustawienia prywatności</span></Button>;
}
