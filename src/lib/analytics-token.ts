const encoder = new TextEncoder();

export const ANALYTICS_SESSION_COOKIE = "pn_session";
export const ANALYTICS_VISITOR_COOKIE = "pn_visitor";
export const ANALYTICS_CONSENT_COOKIE = "pn_consent";
export const ANALYTICS_ACQUISITION_COOKIE = "pn_acquisition";
export const ANALYTICS_INTERNAL_COOKIE = "pn_internal";
export const ANALYTICS_TEST_COOKIE = "pn_analytics_test";
export const SESSION_TTL_SECONDS = 30 * 60;
export const VISITOR_TTL_SECONDS = 180 * 24 * 60 * 60;

type TimedToken = { exp: number };

export async function signAnalyticsToken<T extends TimedToken>(purpose: string, payload: T) {
  const secret = analyticsSigningSecret();
  if (!secret) return null;
  const encoded = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(`${purpose}.${encoded}`, secret);
  return `${encoded}.${signature}`;
}

export async function verifyAnalyticsToken<T extends TimedToken>(purpose: string, token?: string | null): Promise<T | null> {
  const secret = analyticsSigningSecret();
  if (!secret || !token) return null;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("HMAC", key, decodeBase64Url(signature), encoder.encode(`${purpose}.${encoded}`));
  if (!valid) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) as T;
    return Number.isFinite(payload.exp) && payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

export function analyticsSigningConfigured() {
  return Boolean(analyticsSigningSecret());
}

function analyticsSigningSecret() {
  const configured = process.env.ANALYTICS_SIGNING_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV !== "production") return "pozanuta-local-analytics-signing-key-only";
  return null;
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encodeBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
