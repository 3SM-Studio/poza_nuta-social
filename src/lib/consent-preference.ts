import { CONSENT_VERSION } from "./consent-version";

// This unsigned cookie may only reduce tracking permission. It never grants consent.
export const CONSENT_PREFERENCE_COOKIE = "pn_consent_preference";
export type LocalPreference = "deny" | "pending-accept" | null;
const maxAge = 180 * 24 * 60 * 60;
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const pendingValue = new RegExp(`^${CONSENT_VERSION}\\.pending-accept\\.(${uuid})$`, "i");

export function parseLocalPreference(value: string | undefined | null): LocalPreference {
  if (value === `${CONSENT_VERSION}.deny`) return "deny";
  if (value && pendingValue.test(value)) return "pending-accept";
  return null;
}

export function pendingConsentAttemptId(value: string | undefined | null): string | null {
  return value?.match(pendingValue)?.[1]?.toLowerCase() || null;
}

export function browserPreferenceValue(): string | null {
  if (typeof document === "undefined") return null;
  return document.cookie.split("; ").find((part) => part.startsWith(`${CONSENT_PREFERENCE_COOKIE}=`))?.split("=")[1] || null;
}

export function readBrowserPreference(): LocalPreference { return parseLocalPreference(browserPreferenceValue()); }
export function browserPendingAttemptId() { return pendingConsentAttemptId(browserPreferenceValue()); }

export function localPreferenceCookie(value: "deny" | null, secure: boolean, attemptId?: string) {
  const stored = attemptId ? `${CONSENT_VERSION}.pending-accept.${attemptId}` : value ? `${CONSENT_VERSION}.deny` : "";
  return `${CONSENT_PREFERENCE_COOKIE}=${stored}; Path=/; Max-Age=${stored ? maxAge : 0}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
