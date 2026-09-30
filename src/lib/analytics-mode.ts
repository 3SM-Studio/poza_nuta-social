import type { NextRequest } from "next/server";
import { readAnalyticsConsent } from "./tracking-context";

export type AnalyticsMode = "cookieless" | "consented";

// The signed server choice is authoritative; the local preference can only reduce permission.
export async function effectiveAnalyticsMode(request: NextRequest): Promise<AnalyticsMode> {
  return (await readAnalyticsConsent(request)) ? "consented" : "cookieless";
}
