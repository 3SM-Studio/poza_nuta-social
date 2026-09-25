import { expect, test } from "@playwright/test";
import { loginWithMagicEmail } from "./helpers/local-admin-auth";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { ANALYTICS_PROJECT_KEY } from "../../src/lib/analytics-project";

const email = process.env.LOCAL_ADMIN_E2E_EMAIL;
const mailpit = process.env.LOCAL_MAILPIT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

test("Realtime is guarded, reflects accepted events, refreshes safely and works at 360px", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!email || !mailpit || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires local Supabase/Auth/Mailpit");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const unauthorized = await request.get("/admin/realtime/data?window=30");
  expect(unauthorized.status()).toBe(401);
  await page.goto("/admin/realtime");
  await expect(page).toHaveURL(/\/admin\/login/);

  await loginWithMagicEmail(page, request, email!);

  const cookielessId = crypto.randomUUID();
  const testId = crypto.randomUUID();
  const developmentId = crypto.randomUUID();
  const consentedId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const { error: cookielessError } = await admin.from("analytics_cookieless_events").insert({
    event_id: cookielessId, project_key: ANALYTICS_PROJECT_KEY, event_name: "page_view",
    environment: "production", traffic_class: "external", path: "/karaoke-trojmiasto", utm_source: "newsletter",
  });
  expect(cookielessError).toBeNull();
  const { error: technicalError } = await admin.from("analytics_cookieless_events").insert([
    { event_id: testId, project_key: ANALYTICS_PROJECT_KEY, event_name: "page_view", environment: "production", traffic_class: "test", path: "/cookies" },
    { event_id: developmentId, project_key: ANALYTICS_PROJECT_KEY, event_name: "page_view", environment: "development", traffic_class: "external", path: "/prywatnosc" },
  ]);
  expect(technicalError).toBeNull();
  const { error: sessionError } = await admin.from("analytics_sessions_v2").insert({
    session_id: sessionId, environment: "production", traffic_class: "external", analytics_consent: true,
  });
  expect(sessionError).toBeNull();
  const { error: consentedError } = await admin.from("analytics_events_v2").insert({
    event_id: consentedId, event_name: "contact_click", session_id: sessionId, session_sequence: 1,
    environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt",
    observed_context: { source: "google", medium: "organic" },
  });
  expect(consentedError).toBeNull();
  const { data: exception, error: exceptionError } = await admin.from("analytics_quality_exceptions").insert({
    project_key: ANALYTICS_PROJECT_KEY, surface: "api_track", mode: "cookieless", event_name: "page_view",
    outcome: "duplicate", reason: "idempotent_retry",
  }).select("id").single();
  expect(exceptionError).toBeNull();

  try {
    await page.goto("/admin/realtime?window=30");
    await expect(page.getByRole("heading", { name: "Realtime" })).toBeVisible();
    await expect(page.getByText("Aktywny zakres: Ruch biznesowy")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Najczęściej oglądane strony" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Obserwowane źródła" })).toBeVisible();
    await expect(page.getByText("Sesje consented z aktywnością").first()).toBeVisible();
    await page.getByRole("button", { name: "Co dokładnie liczymy?" }).click();
    await expect(page.locator("#realtime-definitions").getByRole("heading", { name: "Sesje consented z aktywnością" })).toBeVisible();
    await page.getByRole("button", { name: "Ukryj definicje metryk" }).click();
    await expect(page.getByText(/Data Quality \(cały ruch\): .*wyjątk/)).toBeVisible();
    const response = await page.context().request.get("/admin/realtime/data?window=30");
    expect(response.status()).toBe(200);
    const report = await response.json() as { totalEvents: number; cookielessEvents: number; consentedEvents: number; eventCounts: Record<string, number>; consentedSessionsWithActivity: number; topPages: Array<{ label: string }> };
    expect(report.totalEvents).toBe(report.cookielessEvents + report.consentedEvents);
    expect(report.eventCounts.page_view).toBeGreaterThanOrEqual(1);
    expect(report.consentedSessionsWithActivity).toBeGreaterThanOrEqual(1);
    const diagnosticResponse = await page.context().request.get("/admin/realtime/data?window=30&scope=diagnostic");
    expect(diagnosticResponse.status()).toBe(200);
    const diagnostic = await diagnosticResponse.json() as { totalEvents: number; eventCounts: Record<string, number> };
    expect(diagnostic.totalEvents).toBeGreaterThanOrEqual(report.totalEvents + 2);
    expect(diagnostic.eventCounts.page_view).toBeGreaterThanOrEqual(report.eventCounts.page_view + 2);
    await page.getByRole("navigation", { name: "Zakres ruchu Realtime" }).getByRole("link", { name: "Diagnostyka: wszystkie przyjęte zdarzenia" }).click();
    await expect(page.getByText("Aktywny zakres: Diagnostyka: wszystkie przyjęte zdarzenia")).toBeVisible();
    await expect(page).toHaveURL(/scope=diagnostic/);
    await page.getByRole("button", { name: "Odśwież Realtime" }).click();
    await expect(page.getByText("Aktywny zakres: Diagnostyka: wszystkie przyjęte zdarzenia")).toBeVisible();
    await page.getByRole("navigation", { name: "Zakres ruchu Realtime" }).getByRole("link", { name: "Ruch biznesowy" }).click();
    await expect(page.getByText("Aktywny zakres: Ruch biznesowy")).toBeVisible();
    await page.goto(`/admin/debug?record=cookieless:${testId}`);
    await expect(page.getByText(testId)).toBeVisible();
    await expect(page.getByText("test", { exact: true })).toBeVisible();
    await page.goto("/admin/realtime?window=30");
    expect((await page.context().request.get("/admin/realtime/data?window=1440")).status()).toBe(400);
    await page.screenshot({ path: testInfo.outputPath("realtime-desktop.png"), fullPage: true });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.route("**/admin/realtime/data?window=30", (route) => route.fulfill({ status: 503, body: "{}" }));
    await page.getByRole("button", { name: "Odśwież Realtime" }).click();
    await expect(page.getByText(/Dane nieaktualne/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Najczęściej oglądane strony" })).toBeVisible();
    await page.unroute("**/admin/realtime/data?window=30");
    await page.getByRole("button", { name: "Odśwież Realtime" }).click();
    await expect(page.getByText(/Dane nieaktualne/)).toHaveCount(0);

    let requests = 0;
    let release: (() => void) | undefined;
    await page.route("**/admin/realtime/data?window=30", async (route) => {
      requests += 1;
      await new Promise<void>((resolve) => { release = resolve; });
      await route.fulfill({ status: 503, body: "{}" });
    });
    await page.getByRole("button", { name: "Odśwież Realtime" }).click();
    await expect(page.getByRole("button", { name: "Odśwież Realtime" })).toBeDisabled();
    expect(requests).toBe(1);
    release?.();
    await expect(page.getByRole("button", { name: "Odśwież Realtime" })).toBeEnabled();
    await page.unroute("**/admin/realtime/data?window=30");

    await page.clock.install();
    let releaseTimeout: (() => void) | undefined;
    await page.route("**/admin/realtime/data?window=30", async (route) => {
      await new Promise<void>((resolve) => { releaseTimeout = resolve; });
      await route.fulfill({ status: 200, body: "{}" }).catch(() => {});
    });
    await page.getByRole("button", { name: "Odśwież Realtime" }).click();
    await expect(page.getByRole("button", { name: "Odśwież Realtime" })).toBeDisabled();
    await page.clock.fastForward(10_100);
    await expect(page.getByRole("button", { name: "Odśwież Realtime" })).toBeEnabled();
    await expect(page.getByText(/Dane nieaktualne/)).toBeVisible();
    releaseTimeout?.();
    await page.unroute("**/admin/realtime/data?window=30");

    const zeroReport = { ...report, windowStart: new Date(Date.now() - 30 * 60_000).toISOString(), windowEnd: new Date().toISOString(), refreshedAt: new Date().toISOString(),
      totalEvents: 0, cookielessEvents: 0, consentedEvents: 0, consentedSessionsWithActivity: 0, eventCounts: {},
      topPages: [], observedSources: [], topCampaigns: [], topTrackingLinks: [], topDestinations: [], qualityExceptions: 0 };
    await page.route("**/admin/realtime/data?window=30", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(zeroReport) }));
    await page.getByRole("button", { name: "Odśwież Realtime" }).click();
    await expect(page.getByText(/Brak przyjętych zdarzeń w tym zakresie ruchu i oknie/)).toBeVisible();
    await expect(page.getByText("—")).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "Kampanie z wejść śledzących" })).toHaveCount(0);
    await page.unroute("**/admin/realtime/data?window=30");
    await page.getByRole("button", { name: "Odśwież Realtime" }).click();
    await expect(page.getByText(/Brak przyjętych zdarzeń w tym zakresie ruchu i oknie/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Odśwież Realtime" })).toBeEnabled();

    await page.setViewportSize({ width: 360, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
    await page.screenshot({ path: testInfo.outputPath("realtime-mobile.png"), fullPage: true });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.reload();
    let automaticReads = 0;
    page.on("request", (outbound) => { if (outbound.url().includes("/admin/realtime/data?window=30")) automaticReads += 1; });
    await page.evaluate(() => Object.defineProperty(document, "hidden", { configurable: true, get: () => true }));
    await page.clock.fastForward(31_000);
    expect(automaticReads).toBe(0);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(() => automaticReads).toBe(1);
  } finally {
    await admin.from("analytics_quality_exceptions").delete().eq("id", exception!.id);
    await admin.from("analytics_cookieless_events").delete().eq("event_id", cookielessId);
    await admin.from("analytics_cookieless_events").delete().in("event_id", [testId, developmentId]);
    await admin.from("analytics_events_v2").delete().eq("event_id", consentedId);
    await admin.from("analytics_sessions_v2").delete().eq("session_id", sessionId);
  }
});
