"use client";

export type ClientEventName = "page_view" | "contact_view" | "contact_click" | "hub_resumed";
let permitted = false;
let consentChannel: BroadcastChannel | null = null;

function channel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!consentChannel) {
    consentChannel = new BroadcastChannel("pn-consent-v2");
    consentChannel.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== "boolean") return;
      setAnalyticsAllowed(event.data);
      window.dispatchEvent(new Event("pn-consent-changed"));
    };
  }
  return consentChannel;
}

export function analyticsAllowed() { return permitted; }
export function setAnalyticsAllowed(value: boolean) {
  channel();
  permitted = value;
  if (!value) {
    try { sessionStorage.removeItem(HUB_OUTBOUND_STATE_KEY); } catch { /* optional storage */ }
  }
}
export function announceAnalyticsChoice(value: boolean) {
  setAnalyticsAllowed(value);
  channel()?.postMessage(value);
}

export function sendAnalyticsEvent(eventName: ClientEventName, properties: Record<string, unknown> = {}) {
  if (!permitted) return;
  const payload = JSON.stringify({ eventId: crypto.randomUUID(), eventName, path: window.location.pathname, properties });
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    if (sent) return;
  }
  void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
}

export const HUB_OUTBOUND_STATE_KEY = "pn_hub_outbound_v1";
