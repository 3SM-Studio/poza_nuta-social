import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { ANALYTICS_PROJECT_KEY } from "../../src/lib/analytics-project";

const email = process.env.LOCAL_ADMIN_E2E_EMAIL;
const mailpit = process.env.LOCAL_MAILPIT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

test("DebugView is guarded, bounded, responsive and keeps exceptions sanitized", async ({ page, request }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!email || !mailpit || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires local Supabase/Auth/Mailpit");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  await page.goto("/admin/debug");
  await expect(page).toHaveURL(/\/admin\/login/);

  const beforeMailbox = await (await request.get(`${mailpit}/api/v1/messages`)).json() as { messages?: Array<{ ID?: string }> };
  const existingIds = new Set(beforeMailbox.messages?.map((message) => message.ID).filter(Boolean));
  await page.getByLabel("E-mail").fill(email!);
  await page.getByRole("button", { name: "Wyślij magic link" }).click();
  let messageId: string | null = null;
  await expect.poll(async () => {
    const mailbox = await (await request.get(`${mailpit}/api/v1/messages`)).json() as { messages?: Array<{ ID?: string }> };
    messageId = mailbox.messages?.find((message) => message.ID && !existingIds.has(message.ID))?.ID || null;
    return messageId;
  }, { timeout: 10_000 }).not.toBeNull();
  const message = await (await request.get(`${mailpit}/api/v1/message/${messageId}`)).json() as { HTML?: string; Text?: string };
  const body = `${message.HTML || ""}\n${message.Text || ""}`.replaceAll("&amp;", "&");
  const magicUrl = body.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/)?.[0];
  expect(magicUrl).toBeTruthy();
  await page.goto(magicUrl!);

  const eventId = crypto.randomUUID();
  const consentedEventId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const marker = `forbidden-${Date.now()}`;
  const { error: eventError } = await admin.from("analytics_cookieless_events").insert({
    event_id: eventId, project_key: ANALYTICS_PROJECT_KEY, event_name: "contact_click", environment: "development", traffic_class: "external", path: "/kontakt",
  });
  expect(eventError).toBeNull();
  const { error: sessionError } = await admin.from("analytics_sessions_v2").insert({
    session_id: sessionId, environment: "development", traffic_class: "external", analytics_consent: true,
  });
  expect(sessionError).toBeNull();
  const { error: consentedError } = await admin.from("analytics_events_v2").insert({
    event_id: consentedEventId, event_name: "contact_click", session_id: sessionId, session_sequence: 1,
    environment: "development", traffic_class: "external", analytics_consent: true, path: "/kontakt",
    observed_context: { source: "google", medium: "organic", campaign: "autumn", referrerHost: "google.com" },
  });
  expect(consentedError).toBeNull();
  const { data: quality, error: qualityError } = await admin.from("analytics_quality_exceptions").insert([
    { project_key: ANALYTICS_PROJECT_KEY, surface: "api_track", outcome: "rejected", reason: "forbidden_field" },
    { project_key: ANALYTICS_PROJECT_KEY, surface: "api_track", mode: "cookieless", event_name: "contact_click", outcome: "duplicate", reason: "idempotent_retry" },
  ]).select("id");
  expect(qualityError).toBeNull();

  try {
    await page.goto("/admin/debug?window=30");
    await expect(page.getByRole("heading", { name: "DebugView" })).toBeVisible();
    await expect(page.getByRole("link", { name: /contact_click.*Zapisane/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /contact_click.*Consented/ }).first()).toBeVisible();
    await page.getByRole("link", { name: /contact_click.*Consented/ }).first().click();
    await expect(page.getByText("google.com")).toBeVisible();
    expect(await page.locator("body").innerText()).not.toContain(sessionId);
    await page.getByRole("link", { name: /contact_click.*Zapisane.*Cookieless/ }).first().click();
    await expect(page.getByText(/bez identyfikatora przeglądarki i sesji/)).toBeVisible();
    await expect(page.getByText("Niedozwolone pole (forbidden_field)")).toHaveCount(0);
    await page.getByRole("link", { name: /Nazwa niedostępna.*Odrzucone/ }).first().click();
    await expect(page.getByText("Niedozwolone pole (forbidden_field)")).toBeVisible();
    await expect(page.getByText(/Surowy payload i wartości niedozwolonych pól: nieprzechowywane/)).toBeVisible();
    expect(await page.locator("body").innerText()).not.toContain(marker);
    await page.getByRole("link", { name: /contact_click.*Duplikat/ }).first().click();
    await expect(page.getByText(/Nie powstał drugi accepted event/)).toBeVisible();
    await page.getByLabel("Wynik").selectOption("accepted");
    await page.getByRole("button", { name: "Zastosuj filtry" }).click();
    await expect(page.getByRole("link", { name: /contact_click.*Zapisane/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Duplikat/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Odśwież", exact: true }).click();
    await expect(page.getByRole("button", { name: "Odśwież", exact: true })).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath("debug-desktop.png"), fullPage: true });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.setViewportSize({ width: 360, height: 800 });
    await expect(page.getByRole("heading", { name: "DebugView" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("link", { name: /contact_click.*Zapisane/ }).first().click();
    await expect.poll(async () => page.locator("#debug-inspector").evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(800);
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
    await page.screenshot({ path: testInfo.outputPath("debug-mobile.png"), fullPage: true });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  } finally {
    await admin.from("analytics_cookieless_events").delete().eq("event_id", eventId);
    await admin.from("analytics_events_v2").delete().eq("event_id", consentedEventId);
    await admin.from("analytics_sessions_v2").delete().eq("session_id", sessionId);
    for (const row of quality ?? []) await admin.from("analytics_quality_exceptions").delete().eq("id", row.id);
  }
});
