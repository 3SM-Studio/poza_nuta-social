"use client";

import { readBrowserPreference } from "./consent-preference";

export type ClientEventName = "page_view" | "contact_view" | "contact_click" | "hub_resumed";
let permitted = false;
let consentChannel: BroadcastChannel | null = null;

function channel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!consentChannel) {
    consentChannel = new BroadcastChannel("pn-consent-v2");
    consentChannel.onmessage = (event: MessageEvent) => {
      if (event.data !== "changed") return;
      setAnalyticsAllowed(false);
      window.dispatchEvent(new Event("pn-consent-changed"));
    };
  }
  return consentChannel;
}

export function analyticsAllowed() {
  if (typeof document === "undefined") return false;
  return permitted && !readBrowserPreference();
}
export function setAnalyticsAllowed(value: boolean) {
  channel();
  permitted = value;
  if (!value) {
    try { sessionStorage.removeItem(HUB_OUTBOUND_STATE_KEY); } catch { /* optional storage */ }
  }
}
export function announceAnalyticsChoice() {
  channel()?.postMessage("changed");
  try { localStorage.setItem("pn_consent_signal", String(Date.now())); localStorage.removeItem("pn_consent_signal"); } catch { /* optional cross-tab fallback */ }
  window.dispatchEvent(new Event("pn-consent-changed"));
}

export function sendAnalyticsEvent(eventName: ClientEventName, properties: Record<string, unknown> = {}) {
  if (eventName === "hub_resumed" && !analyticsAllowed()) return;
  const payload = JSON.stringify({ eventId: crypto.randomUUID(), eventName, path: window.location.pathname, properties });
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    if (sent) return;
  }
  void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
}

export const HUB_OUTBOUND_STATE_KEY = "pn_hub_outbound_v1";
