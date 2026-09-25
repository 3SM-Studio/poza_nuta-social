import { expect, test } from "@playwright/test";
import { loginWithMagicEmail } from "./helpers/local-admin-auth";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { ANALYTICS_PROJECT_KEY } from "../../src/lib/analytics-project";

const email = process.env.LOCAL_ADMIN_E2E_EMAIL;
const mailpit = process.env.LOCAL_MAILPIT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

test("Data Quality is admin-only, responsive and explains empty and issue states", async ({ page, request }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!email || !mailpit || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires local Supabase/Auth/Mailpit");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const emptyUrl = "/admin/data-quality?range=custom&from=2032-01-10&to=2032-01-10";
  const issueUrl = "/admin/data-quality?range=custom&from=2032-01-11&to=2032-01-11";

  await page.goto(emptyUrl);
  await expect(page).toHaveURL(/\/admin\/login/);

  await loginWithMagicEmail(page, request, email!);
  await expect(page.getByRole("heading", { name: "Co naprawdę działa?" })).toBeVisible();

  await page.goto(emptyUrl);
  await expect(page.getByRole("heading", { name: "Data Quality" })).toBeVisible();
  await expect(page.getByText("Brak zapisanych odrzuceń w tym okresie.")).toBeVisible();
  await expect(page.getByText("Brak zapisanych zdarzeń w tym okresie.")).toBeVisible();
  await expect(page.getByText("Brak danych do oceny")).toBeVisible();
  const desktopAxe = await new AxeBuilder({ page }).analyze();
  expect(desktopAxe.violations).toEqual([]);

  const marker = `private-marker-${Date.now()}`;
  const sentAt = new Date().toISOString();
  const rejected = await page.context().request.post("/api/track", { data: {
    eventId: crypto.randomUUID(), eventName: "page_view", path: "/", project_key: "other-project",
    visitor_id: marker, session_id: marker, email: `${marker}@example.com`,
  } });
  expect(rejected.status()).toBe(400);
  let sanitizedId: number | null = null;
  await expect.poll(async () => {
    const { data, error } = await admin.from("analytics_quality_exceptions").select("*")
      .eq("surface", "api_track").eq("reason", "forbidden_field").gte("occurred_at", sentAt)
      .order("id", { ascending: false }).limit(1).maybeSingle();
    expect(error).toBeNull();
    sanitizedId = data?.id ?? null;
    if (!data) return null;
    expect(data.project_key).toBe(ANALYTICS_PROJECT_KEY);
    expect(data.event_name).toBeNull();
    expect(data.mode).toBeNull();
    expect(JSON.stringify(data)).not.toContain(marker);
    expect(data).not.toHaveProperty("visitor_id");
    expect(data).not.toHaveProperty("session_id");
    return data.reason;
  }).toBe("forbidden_field");

  const retryId = crypto.randomUUID();
  const retryAt = new Date().toISOString();
  const retryBody = { eventId: retryId, eventName: "page_view", path: "/" };
  expect((await page.context().request.post("/api/track", { data: retryBody })).status()).toBe(204);
  expect((await page.context().request.post("/api/track", { data: retryBody })).status()).toBe(204);
  const { count: storedCount, error: countError } = await admin.from("analytics_cookieless_events")
    .select("event_id", { count: "exact", head: true }).eq("event_id", retryId);
  expect(countError).toBeNull();
  expect(storedCount).toBe(1);
  let duplicateQualityId: number | null = null;
  await expect.poll(async () => {
    const { data, error } = await admin.from("analytics_quality_exceptions").select("id")
      .eq("reason", "idempotent_retry").eq("mode", "cookieless").eq("surface", "api_track")
      .gte("occurred_at", retryAt).order("id", { ascending: false }).limit(1).maybeSingle();
    expect(error).toBeNull();
    duplicateQualityId = data?.id ?? null;
    return duplicateQualityId;
  }).not.toBeNull();

  const eventId = crypto.randomUUID();
  const { error: eventError } = await admin.from("analytics_cookieless_events").insert({
    event_id: eventId, project_key: ANALYTICS_PROJECT_KEY, event_name: "page_view", occurred_at: "2032-01-11T11:00:00Z",
    environment: "development", traffic_class: "external", path: "/",
  });
  expect(eventError).toBeNull();
  await page.goto(issueUrl);
  await expect(page.getByText("Brak wykrytych problemów w obserwowanym zakresie")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("data-quality-desktop.png"), fullPage: true });
  const { error: exceptionError } = await admin.from("analytics_quality_exceptions").insert([
    { project_key: ANALYTICS_PROJECT_KEY, occurred_at: "2032-01-11T11:01:00Z", surface: "api_track", outcome: "rejected", reason: "invalid_path" },
    { project_key: ANALYTICS_PROJECT_KEY, occurred_at: "2032-01-11T11:02:00Z", surface: "api_track", mode: "cookieless", event_name: "page_view", outcome: "duplicate", reason: "idempotent_retry" },
  ]);
  expect(exceptionError).toBeNull();

  try {
    await page.goto(issueUrl);
    await expect(page.getByText("Wymaga sprawdzenia")).toBeVisible();
    await expect(page.getByText("1 odrzucona próba")).toBeVisible();
    await expect(page.getByText("Niepoprawna ścieżka")).toBeVisible();
    await page.setViewportSize({ width: 360, height: 800 });
    await expect(page.getByRole("heading", { name: "Data Quality" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("data-quality-mobile.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
    const mobileAxe = await new AxeBuilder({ page }).analyze();
    expect(mobileAxe.violations).toEqual([]);
  } finally {
    if (sanitizedId !== null) await admin.from("analytics_quality_exceptions").delete().eq("id", sanitizedId);
    if (duplicateQualityId !== null) await admin.from("analytics_quality_exceptions").delete().eq("id", duplicateQualityId);
    await admin.from("analytics_cookieless_events").delete().eq("event_id", retryId);
    await admin.from("analytics_quality_exceptions").delete().eq("project_key", ANALYTICS_PROJECT_KEY).gte("occurred_at", "2032-01-11T00:00:00Z").lt("occurred_at", "2032-01-12T00:00:00Z");
    await admin.from("analytics_cookieless_events").delete().eq("event_id", eventId);
  }
});
