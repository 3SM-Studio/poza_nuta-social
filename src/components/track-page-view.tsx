"use client";

import { useEffect, useRef } from "react";
import { HUB_OUTBOUND_STATE_KEY, analyticsAllowed, sendAnalyticsEvent } from "@/lib/analytics-client";
import { listenForConsentChanges, readConsentState, retryPendingAccept } from "@/lib/consent-state";
import { hubResumeProperties, parseHubOutboundState, type HubOutboundState } from "@/lib/hub-lifecycle";

let lastDocumentPath: string | null = null;

export function TrackPageView({ contact = false }: { contact?: boolean }) {
  const started = useRef(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    const initialDocumentEntry = lastDocumentPath === null;
    lastDocumentPath = url.pathname;
    const common = {
      // document.referrer survives client navigation; never carry it to a later page.
      referrer: initialDocumentEntry ? document.referrer || null : null,
      utmSource: url.searchParams.get("utm_source"),
      utmMedium: url.searchParams.get("utm_medium"),
      utmCampaign: url.searchParams.get("utm_campaign"),
      utmContent: url.searchParams.get("utm_content"),
      utmTerm: url.searchParams.get("utm_term"),
    };
    const syncConsent = async () => {
      await readConsentState();
      if (!started.current) {
        started.current = true;
        post("page_view", common);
        if (contact) post("contact_view", common);
      }
    };
    void syncConsent().then(retryPendingAccept);
    const onFocus = () => { retryPendingAccept(); void syncConsent(); };

    const markHidden = () => {
      if (document.visibilityState !== "hidden" || !analyticsAllowed()) return;
      const state = readOutboundState();
      if (state) writeOutboundState({ ...state, hidden: true });
    };
    const resume = (event: Event) => {
      if (!analyticsAllowed()) return;
      const state = readOutboundState();
      const properties = hubResumeProperties(
        state,
        Date.now(),
        document.visibilityState,
        event.type,
        event instanceof PageTransitionEvent ? event.persisted : false,
      );
      if (!properties) return;
      sessionStorage.removeItem(HUB_OUTBOUND_STATE_KEY);
      sendAnalyticsEvent("hub_resumed", properties);
    };
    document.addEventListener("visibilitychange", markHidden);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    const stopConsentListener = listenForConsentChanges(() => { void syncConsent(); });
    window.addEventListener("focus", onFocus);
    document.documentElement.dataset.trackingLifecycle = "ready";
    return () => {
      delete document.documentElement.dataset.trackingLifecycle;
      document.removeEventListener("visibilitychange", markHidden);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      stopConsentListener();
      window.removeEventListener("focus", onFocus);
    };
  }, [contact]);
  return null;
}

function post(eventName: "page_view" | "contact_view", context: Record<string, unknown>) {
  const payload = JSON.stringify({ eventId: crypto.randomUUID(), eventName, path: window.location.pathname, ...context });
  void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
}
function readOutboundState() { return parseHubOutboundState(sessionStorage.getItem(HUB_OUTBOUND_STATE_KEY)); }
function writeOutboundState(value: HubOutboundState) { try { sessionStorage.setItem(HUB_OUTBOUND_STATE_KEY, JSON.stringify(value)); } catch { /* optional */ } }
