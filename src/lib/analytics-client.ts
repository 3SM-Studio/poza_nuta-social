"use client";

export type ClientEventName = "page_view" | "contact_view" | "contact_click" | "hub_resumed";

export function sendAnalyticsEvent(eventName: ClientEventName, properties: Record<string, unknown> = {}) {
  const payload = JSON.stringify({ eventId: crypto.randomUUID(), eventName, path: window.location.pathname, properties });
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    if (sent) return;
  }
  void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
}

export const HUB_OUTBOUND_STATE_KEY = "pn_hub_outbound_v1";
