// Shared, browser-safe contract. Server ingestion validates it again at the boundary.
import { marketingCta, marketingSection, type MarketingCtaId, type MarketingSectionId } from "./marketing-journey";

export const CLIENT_EVENT_NAMES = ["page_view", "contact_view", "contact_click", "hub_resumed", "cta_click", "section_view"] as const;
export type ClientEventName = typeof CLIENT_EVENT_NAMES[number];

export type ClientEventPayloads = {
  page_view: Record<string, never>;
  contact_view: Record<string, never>;
  contact_click: { contactType: "email" };
  cta_click: { ctaId: MarketingCtaId };
  section_view: { sectionId: MarketingSectionId };
  hub_resumed: {
    priorDestination: string;
    resumeSignal: "pageshow" | "visibilitychange";
    elapsedBucket: "2-10s" | "10-60s" | "1-30m";
    bfcache: boolean;
  };
};

export function isClientEventName(value: unknown): value is ClientEventName {
  return typeof value === "string" && CLIENT_EVENT_NAMES.some((name) => name === value);
}

export function isClientEventPayload(name: ClientEventName, value: unknown): boolean {
  if (value === undefined) return name === "page_view" || name === "contact_view";
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  const keys = Object.keys(payload);
  if (name === "page_view" || name === "contact_view") return keys.length === 0;
  if (name === "contact_click") return keys.length === 1 && payload.contactType === "email";
  if (name === "cta_click") return keys.length === 1 && marketingCta(payload.ctaId) !== null;
  if (name === "section_view") return keys.length === 1 && marketingSection(payload.sectionId) !== null;
  return keys.length === 4 &&
    typeof payload.priorDestination === "string" && payload.priorDestination.length <= 80 &&
    (payload.resumeSignal === "pageshow" || payload.resumeSignal === "visibilitychange") &&
    (payload.elapsedBucket === "2-10s" || payload.elapsedBucket === "10-60s" || payload.elapsedBucket === "1-30m") &&
    typeof payload.bfcache === "boolean";
}
