"use client";

import { readBrowserPreference } from "./consent-preference";
import { HUB_OUTBOUND_STATE_KEY } from "./hub-lifecycle";

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
