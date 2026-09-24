"use client";

import { announceAnalyticsChoice, setAnalyticsAllowed } from "./analytics-client";
import { browserPendingAttemptId, localPreferenceCookie, readBrowserPreference, type LocalPreference } from "./consent-preference";

export type ConsentState = "unknown" | "pending-accept" | "accepted" | "rejected";
const timeoutMs = 3_500;
const retryIntervalMs = 60_000;
let state: ConsentState = "unknown";
let readInFlight: Promise<ConsentState> | null = null;
let syncQueue: Promise<void> = Promise.resolve();
let lastRetryAt = 0;
let revision = 0;

export function localPreference(): LocalPreference {
  return readBrowserPreference();
}

export function currentConsentState(): ConsentState {
  const preference = localPreference();
  if (preference === "deny") return "rejected";
  if (preference === "pending-accept") return "pending-accept";
  return state;
}

function setPreference(value: LocalPreference) {
  document.cookie = localPreferenceCookie(value === "deny" ? "deny" : null, location.protocol === "https:", value === "pending-accept" ? crypto.randomUUID() : undefined);
}

function applyState(value: ConsentState) {
  state = value;
  setAnalyticsAllowed(value === "accepted");
}

async function boundedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function postChoice(analytics: boolean, expectedRevision: number, expectedAttemptId: string | null) {
  try {
    const response = await boundedFetch("/api/consent", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ analytics, marketing: false }),
    });
    if (!response.ok || expectedRevision !== revision) return;
    if (analytics && expectedAttemptId && browserPendingAttemptId() === expectedAttemptId) {
      setPreference(null);
      applyState("accepted");
      announceAnalyticsChoice();
    } else if (!analytics && localPreference() === "deny") {
      setPreference(null);
      applyState("rejected");
      announceAnalyticsChoice();
    }
  } catch { /* Local deny or pending intent is already effective. */ }
}

export function chooseConsent(analytics: boolean): ConsentState {
  if (analytics && currentConsentState() === "accepted" && !localPreference()) return "accepted";
  revision += 1;
  const expectedRevision = revision;
  setPreference(analytics ? "pending-accept" : "deny");
  const attemptId = analytics ? browserPendingAttemptId() : null;
  applyState(analytics ? "pending-accept" : "rejected");
  if (analytics) lastRetryAt = Date.now();
  announceAnalyticsChoice();
  // Serialize mutations so a slower prior response cannot overwrite a newer choice.
  syncQueue = syncQueue.then(() => postChoice(analytics, expectedRevision, attemptId));
  return currentConsentState();
}

export async function readConsentState(): Promise<ConsentState> {
  const preference = localPreference();
  if (preference) {
    applyState(preference === "deny" ? "rejected" : "pending-accept");
    return currentConsentState();
  }
  if (readInFlight) return readInFlight;
  const readRevision = revision;
  readInFlight = (async () => {
    try {
      const response = await boundedFetch("/api/consent", { cache: "no-store" });
      if (!response.ok) throw new Error("consent-unavailable");
      const data = await response.json() as { choice: { analytics: boolean } | null };
      if (localPreference() || revision !== readRevision) return currentConsentState();
      state = data.choice?.analytics === true ? "accepted" : data.choice?.analytics === false ? "rejected" : "unknown";
      setAnalyticsAllowed(state === "accepted");
    } catch {
      // A confirmed choice in this page remains known during a later read outage.
      // Fresh pages still start at unknown and cannot infer a grant locally.
      if (!localPreference() && revision === readRevision && state === "unknown") setAnalyticsAllowed(false);
    }
    return currentConsentState();
  })().finally(() => { readInFlight = null; });
  return readInFlight;
}

export function retryPendingAccept() {
  if (localPreference() !== "pending-accept" || Date.now() - lastRetryAt < retryIntervalMs) return;
  lastRetryAt = Date.now();
  const expectedRevision = revision;
  const attemptId = browserPendingAttemptId();
  syncQueue = syncQueue.then(() => postChoice(true, expectedRevision, attemptId));
}

export function listenForConsentChanges(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== "pn_consent_signal") return;
    setAnalyticsAllowed(false);
    window.dispatchEvent(new Event("pn-consent-changed"));
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("pn-consent-changed", callback);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("pn-consent-changed", callback); };
}
