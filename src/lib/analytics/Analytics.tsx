"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analyticsAllowed } from "../consent-analytics-gate";
import { listenForConsentChanges, readConsentState, retryPendingAccept } from "../consent-state";
import { HUB_OUTBOUND_STATE_KEY, hubResumeProperties, parseHubOutboundState, type HubOutboundState } from "../hub-lifecycle";
import { isPublicPath } from "../public-paths";
import { track, trackPageEntry } from "./client";

let documentEntryConsumed = false;

export function Analytics() {
  return <Suspense fallback={null}><AnalyticsLifecycle /></Suspense>;
}

function AnalyticsLifecycle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastEntry = useRef<string | null>(null);
  const search = searchParams.toString();

  useEffect(() => {
    if (!isPublicPath(pathname)) return;
    const key = `${pathname}?${search}`;
    if (lastEntry.current === key) return;
    lastEntry.current = key;
    const initialDocumentEntry = !documentEntryConsumed;
    documentEntryConsumed = true;
    trackPageEntry(pathname, search, initialDocumentEntry);
    void readConsentState().then(retryPendingAccept);
  }, [pathname, search]);

  useEffect(() => {
    const syncConsent = () => { void readConsentState().then(retryPendingAccept); };
    const onFocus = () => { retryPendingAccept(); syncConsent(); };
    const markHidden = () => {
      if (document.visibilityState !== "hidden" || !analyticsAllowed()) return;
      const state = readOutboundState();
      if (state) writeOutboundState({ ...state, hidden: true });
    };
    const resume = (event: Event) => {
      if (!analyticsAllowed()) return;
      const properties = hubResumeProperties(
        readOutboundState(), Date.now(), document.visibilityState, event.type,
        event instanceof PageTransitionEvent ? event.persisted : false,
      );
      if (!properties) return;
      try { sessionStorage.removeItem(HUB_OUTBOUND_STATE_KEY); } catch { /* Optional storage. */ }
      track("hub_resumed", properties);
    };
    document.addEventListener("visibilitychange", markHidden);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", onFocus);
    const stopConsentListener = listenForConsentChanges(syncConsent);
    document.documentElement.dataset.trackingLifecycle = "ready";
    return () => {
      delete document.documentElement.dataset.trackingLifecycle;
      document.removeEventListener("visibilitychange", markHidden);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", onFocus);
      stopConsentListener();
    };
  }, []);
  return null;
}

function readOutboundState() {
  try { return parseHubOutboundState(sessionStorage.getItem(HUB_OUTBOUND_STATE_KEY)); }
  catch { return null; }
}
function writeOutboundState(value: HubOutboundState) {
  try { sessionStorage.setItem(HUB_OUTBOUND_STATE_KEY, JSON.stringify(value)); }
  catch { /* Optional storage. */ }
}
