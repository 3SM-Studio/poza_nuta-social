import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

const email = process.env.LOCAL_ADMIN_E2E_EMAIL;
const mailpit = process.env.LOCAL_MAILPIT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const range = "range=custom&from=2032-04-05&to=2032-04-05";

test("Funnels is admin-only, counts scoped sessions, and works at narrow widths", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!email || !mailpit || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires local Supabase/Auth/Mailpit");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  await page.goto(`/admin/funnels?${range}`);
  await expect(page).toHaveURL(/\/admin\/login/);

  const before = await (await request.get(`${mailpit}/api/v1/messages`)).json() as { messages?: Array<{ ID?: string }> };
  const existing = new Set(before.messages?.map((message) => message.ID).filter(Boolean));
  await page.getByLabel("E-mail").fill(email!);
  await page.getByRole("button", { name: "Wyślij magic link" }).click();
  await expect(page.getByText(/Link do logowania został wysłany/)).toBeVisible();
  let messageId: string | null = null;
  await expect.poll(async () => {
    const mailbox = await (await request.get(`${mailpit}/api/v1/messages`)).json() as { messages?: Array<{ ID?: string }> };
    messageId = mailbox.messages?.find((message) => message.ID && !existing.has(message.ID))?.ID || null;
    return messageId;
  }, { timeout: 10_000 }).not.toBeNull();
  const message = await (await request.get(`${mailpit}/api/v1/message/${messageId}`)).json() as { HTML?: string; Text?: string };
  const body = `${message.HTML || ""}\n${message.Text || ""}`.replaceAll("&amp;", "&");
  const magicUrl = body.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/)?.[0];
  expect(magicUrl).toBeTruthy();
  await page.goto(magicUrl!);

  const sessions = Array.from({ length: 3 }, () => crypto.randomUUID());
  const cookielessIds = Array.from({ length: 2 }, () => crypto.randomUUID());
  const events = [
    { event_id: crypto.randomUUID(), event_name: "tracking_entry", occurred_at: "2032-04-05T10:00:00Z", session_id: sessions[0], session_sequence: 1, environment: "production", traffic_class: "external", analytics_consent: true, path: "/r/ABCDE" },
    { event_id: crypto.randomUUID(), event_name: "contact_view", occurred_at: "2032-04-05T10:01:00Z", session_id: sessions[0], session_sequence: 2, environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt" },
    { event_id: crypto.randomUUID(), event_name: "contact_click", occurred_at: "2032-04-05T10:02:00Z", session_id: sessions[0], session_sequence: 3, environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt" },
    { event_id: crypto.randomUUID(), event_name: "contact_view", occurred_at: "2032-04-05T11:00:00Z", session_id: sessions[1], session_sequence: 1, environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt" },
    { event_id: crypto.randomUUID(), event_name: "contact_view", occurred_at: "2032-04-07T11:00:00Z", session_id: sessions[2], session_sequence: 1, environment: "preview", traffic_class: "external", analytics_consent: true, path: "/kontakt" },
    { event_id: crypto.randomUUID(), event_name: "contact_click", occurred_at: "2032-04-07T11:01:00Z", session_id: sessions[2], session_sequence: 2, environment: "preview", traffic_class: "external", analytics_consent: true, path: "/kontakt" },
  ];
  const assertNoError = (error: { message: string } | null) => expect(error?.message ?? null).toBeNull();
  try {
    assertNoError((await admin.from("analytics_sessions_v2").insert(sessions.map((session_id) => ({ session_id, environment: "production", traffic_class: "external", analytics_consent: true })))).error);
    assertNoError((await admin.from("analytics_events_v2").insert(events)).error);
    assertNoError((await admin.from("analytics_cookieless_events").insert([
      { event_id: cookielessIds[0], project_key: "poza_nuta", event_name: "contact_view", occurred_at: "2032-04-05T12:00:00Z", environment: "production", traffic_class: "external", path: "/kontakt" },
      { event_id: cookielessIds[1], project_key: "poza_nuta", event_name: "contact_click", occurred_at: "2032-04-05T12:01:00Z", environment: "production", traffic_class: "external", path: "/kontakt" },
    ])).error);

    await page.goto(`/admin/funnels?${range}`);
    await expect(page.getByRole("heading", { name: "Analiza funnelu" })).toBeVisible();
    await expect(page.getByText("50%", { exact: true }).first()).toBeVisible();
    const steps = page.getByRole("list", { name: "Kolejne kroki funnelu" }).getByRole("listitem");
    await expect(steps).toHaveCount(2);
    await expect(steps.nth(0)).toContainText("2");
    await expect(steps.nth(1)).toContainText("1");
    await expect(page.getByText(/Zdarzenia cookieless nie tworzą sesji|nie analizuje zdarzeń cookieless/).first()).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("funnels-desktop.png"), fullPage: true });

    for (const width of [360, 320]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`funnels-${width}.png`), fullPage: true });
    }
    await page.goto(`/admin/funnels?${range}&funnel=tracked_entry_to_contact`);
    await expect(page.getByRole("list", { name: "Kolejne kroki funnelu" }).getByRole("listitem")).toHaveCount(3);
    await expect(page.getByText("100%", { exact: true }).first()).toBeVisible();

    await page.goto("/admin/funnels?range=custom&from=2032-04-07&to=2032-04-07");
    await expect(page.getByRole("main").getByText("Brak sesji consented w wybranym zakresie ruchu.")).toBeVisible();
    await page.getByRole("link", { name: "Diagnostyka: wszystkie przyjęte zdarzenia" }).click();
    await expect(page.getByText("100%", { exact: true }).first()).toBeVisible();
    await page.goto("/admin/funnels?range=custom&from=2032-04-06&to=2032-04-05");
    await expect(page.getByRole("heading", { name: "Nieprawidłowy zakres dat" })).toBeVisible();
    await expect(page.getByText("Raport nie został przeliczony.")).toBeVisible();
  } finally {
    const eventIds = events.map((event) => `'${event.event_id}'`).join(",");
    const sessionIds = sessions.map((id) => `'${id}'`).join(",");
    const cookieless = cookielessIds.map((id) => `'${id}'`).join(",");
    const sql = `begin; delete from public.analytics_events_v2 where event_id in (${eventIds}); delete from public.analytics_sessions_v2 where session_id in (${sessionIds}); delete from public.analytics_cookieless_events where event_id in (${cookieless}); commit;`;
    execFileSync("docker", ["exec", "supabase_db_pozanuta-social", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], { stdio: "pipe" });
  }
});
