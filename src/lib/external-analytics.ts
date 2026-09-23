import type { TrackingContext } from "@/lib/tracking-context";

export function ga4Eligible(context: TrackingContext) {
  return context.environment === "production" && context.trafficClass === "external" && context.consent.analytics;
}

export function marketingSinkEligible(context: TrackingContext) {
  return context.environment === "production" && context.trafficClass === "external" && context.consent.marketing;
}

export function ga4Configured() {
  return Boolean(process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim());
}

// No vendor call is made in this phase. Activation requires a resolved canonical
// domain, reviewed CSP/privacy text, a real measurement property, and browser QA.
