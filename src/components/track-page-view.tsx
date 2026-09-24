"use client";

import { useEffect, useRef } from "react";
import { HUB_OUTBOUND_STATE_KEY, analyticsAllowed, sendAnalyticsEvent } from "@/lib/analytics-client";
import { listenForConsentChanges, readConsentState, retryPendingAccept } from "@/lib/consent-state";
import { hubResumeProperties, parseHubOutboundState, type HubOutboundState } from "@/lib/hub-lifecycle";

export function TrackPageView({ contact = false }: { contact?: boolean }) {
  const started = useRef(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    const common = {
      referrer: document.referrer || null,
      utmSource: url.searchParams.get("utm_source"),
      utmMedium: url.searchParams.get("utm_medium"),
      utmCampaign: url.searchParams.get("utm_campaign"),
      utmContent: url.searchParams.get("utm_content"),
    };
    const syncConsent = async () => {
      const consent = await readConsentState();
      if (consent !== "accepted") started.current = false;
      if (analyticsAllowed() && !started.current) {
        started.current = true;
        post("page_view", { navigationType: navigationType() }, common);
        if (contact) post("contact_view", { navigationType: navigationType() }, common);
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

function post(eventName: "page_view" | "contact_view", properties: Record<string, unknown>, context: Record<string, unknown>) {
  if (!analyticsAllowed()) return;
  const payload = JSON.stringify({ eventId: crypto.randomUUID(), eventName, path: window.location.pathname, properties, ...context });
  void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
}
function navigationType() { const entry = performance.getEntriesByType("navigation")[0]; return entry instanceof PerformanceNavigationTiming ? entry.type : "navigate"; }
function readOutboundState() { return parseHubOutboundState(sessionStorage.getItem(HUB_OUTBOUND_STATE_KEY)); }
function writeOutboundState(value: HubOutboundState) { try { sessionStorage.setItem(HUB_OUTBOUND_STATE_KEY, JSON.stringify(value)); } catch { /* optional */ } }
