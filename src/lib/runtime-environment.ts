import type { NextRequest } from "next/server";
import type { AnalyticsEnvironment } from "./analytics-taxonomy";

// Only server runtime configuration determines the persistence environment.
// URL parameters, request headers and client payloads are never authoritative.
export function resolveServerEnvironment(request?: NextRequest): AnalyticsEnvironment {
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  if (process.env.VERCEL_ENV === "development") return "development";
  if (process.env.ANALYTICS_ENV === "staging") return "staging";
  const host = request?.nextUrl.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "development";
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function assertBusinessMutationAllowed(): void {
  if (resolveServerEnvironment() === "preview") {
    throw new Error("PREVIEW_READ_ONLY: Preview — tryb tylko do odczytu");
  }
}

export function previewDeploymentOrigin(): string | null {
  if (resolveServerEnvironment() !== "preview") return null;
  const host = process.env.VERCEL_URL;
  return host && /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app$/i.test(host) ? `https://${host}` : null;
}

export function ownAnalyticsHost(request: NextRequest, configuredSiteUrl: string): string {
  return resolveServerEnvironment(request) === "preview"
    ? request.nextUrl.hostname
    : new URL(configuredSiteUrl).hostname;
}
