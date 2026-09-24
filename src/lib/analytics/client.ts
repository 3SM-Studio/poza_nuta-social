"use client";

import { analyticsAllowed } from "../consent-analytics-gate";
import { HUB_OUTBOUND_STATE_KEY } from "../hub-lifecycle";
import { isClientEventName, isClientEventPayload, type ClientEventName, type ClientEventPayloads } from "./contract";

type PageEntry = {
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

// Browser calls are best effort. The app-owned route makes the authoritative mode choice.
export function track<Name extends ClientEventName>(
  eventName: Name,
  ...args: ClientEventPayloads[Name] extends Record<string, never> ? [properties?: ClientEventPayloads[Name]] : [properties: ClientEventPayloads[Name]]
): void {
  try {
    if (typeof window !== "undefined") dispatch(eventName, args[0], window.location.pathname);
  } catch { /* Analytics cannot interrupt a public action. */ }
}

export function recordOutboundChoice(destination: string): void {
  try {
    if (!analyticsAllowed()) return;
    sessionStorage.setItem(HUB_OUTBOUND_STATE_KEY, JSON.stringify({ destination, at: Date.now(), hidden: false }));
  } catch { /* Optional consented session state. */ }
}

export function trackPageEntry(path: string, search: string, initialDocumentEntry: boolean): void {
  try {
    const query = new URLSearchParams(search);
    const entry: PageEntry = {
      // document.referrer survives client navigation and must only describe the first document.
      referrer: initialDocumentEntry ? document.referrer || null : null,
      utmSource: query.get("utm_source"),
      utmMedium: query.get("utm_medium"),
      utmCampaign: query.get("utm_campaign"),
      utmContent: query.get("utm_content"),
      utmTerm: query.get("utm_term"),
    };
    dispatch("page_view", undefined, path, entry);
    if (path === "/kontakt") dispatch("contact_view", undefined, path, entry);
  } catch { /* Page rendering must survive analytics failures. */ }
}

function dispatch(eventName: unknown, properties: unknown, path: string, entry?: PageEntry): void {
  try {
    if (typeof window === "undefined" || !isClientEventName(eventName) || !isClientEventPayload(eventName, properties)) return;
    if (eventName === "hub_resumed" && !analyticsAllowed()) return;
    const payload = JSON.stringify({ eventId: crypto.randomUUID(), eventName, path, ...entry, ...(properties === undefined ? {} : { properties }) });
    if (eventName !== "page_view" && eventName !== "contact_view" && navigator.sendBeacon) {
      try {
        if (navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }))) return;
      } catch { /* Try fetch for browsers whose beacon implementation throws. */ }
    }
    void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
  } catch { /* Analytics cannot interrupt a public action. */ }
}
