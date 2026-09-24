import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

const email = process.env.LOCAL_ADMIN_E2E_EMAIL;
const mailpit = process.env.LOCAL_MAILPIT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const range = "range=custom&from=2032-04-10&to=2032-04-10";

test("Key Events is admin-only and keeps event and session populations distinct", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!email || !mailpit || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires local Supabase/Auth/Mailpit");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  await page.goto(`/admin/key-events?${range}`);
  await expect(page).toHaveURL(/\/admin\/login/);

  const before = await (await request.get(`${mailpit}/api/v1/messages`)).json() as { messages?: Array<{ ID?: string }> };
  const existing = new Set(before.messages?.map((message) => message.ID).filter(Boolean));
  await page.getByLabel("E-mail").fill(email!);
  await page.getByRole("button", { name: "Wyślij magic link" }).click();
  await expect(page.getByText(/Link do logowania został wysłany/)).toBeVisible();
  let messageId: string | null = null;
  await expect.poll(async () => {
    const mailbox = await (await request.get(`${mailpit}/api/v1/messages`)).json() as { messages?: Array<{ ID?: string; Subject?: string; To?: Array<{ Address?: string }> }> };
    messageId = mailbox.messages?.find((message) => message.ID && !existing.has(message.ID)
      && message.Subject === "Your sign-in link" && message.To?.some((recipient) => recipient.Address === email))?.ID || null;
    return messageId;
  }, { timeout: 10_000 }).not.toBeNull();
  const message = await (await request.get(`${mailpit}/api/v1/message/${messageId}`)).json() as { HTML?: string; Text?: string };
  const body = `${message.HTML || ""}\n${message.Text || ""}`.replaceAll("&amp;", "&");
  const magicUrl = body.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/)?.[0];
  expect(magicUrl).toBeTruthy();
  await page.goto(magicUrl!);
  await expect(page).not.toHaveURL(/\/admin\/login/);

  const sessionId = crypto.randomUUID();
  const eventIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  const cookielessIds = [crypto.randomUUID(), crypto.randomUUID()];
  const noError = (error: { message: string } | null) => expect(error?.message ?? null).toBeNull();
  try {
    noError((await admin.from("analytics_sessions_v2").insert({ session_id: sessionId, environment: "production", traffic_class: "external", analytics_consent: true })).error);
    noError((await admin.from("analytics_events_v2").insert([
      { event_id: eventIds[0], event_name: "contact_click", occurred_at: "2032-04-10T10:00:00Z", session_id: sessionId, session_sequence: 1, environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt" },
      { event_id: eventIds[1], event_name: "contact_click", occurred_at: "2032-04-10T10:01:00Z", session_id: sessionId, session_sequence: 2, environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt" },
      { event_id: eventIds[2], event_name: "contact_click", occurred_at: "2032-04-10T10:02:00Z", session_id: sessionId, session_sequence: 3, environment: "preview", traffic_class: "external", analytics_consent: true, path: "/kontakt" },
    ])).error);
    noError((await admin.from("analytics_cookieless_events").insert([
      { event_id: cookielessIds[0], project_key: "poza_nuta", event_name: "contact_click", occurred_at: "2032-04-10T10:03:00Z", environment: "production", traffic_class: "external", path: "/kontakt" },
      { event_id: cookielessIds[1], project_key: "poza_nuta", event_name: "contact_click", occurred_at: "2032-04-10T10:04:00Z", environment: "preview", traffic_class: "external", path: "/kontakt" },
    ])).error);

    await page.goto(`/admin/key-events?${range}`);
    await expect(page.getByRole("heading", { name: "Key Events / Outcomes" })).toBeVisible();
    const contact = page.getByRole("heading", { name: "Kliknięcia kontaktu" }).locator("../..");
    await expect(contact).toContainText("3");
    await expect(contact).toContainText("Cookieless1");
    await expect(contact).toContainText("Consented2");
    await expect(contact).toContainText("Sesje consented ze zdarzeniem1");
    await expect(page.getByText(/nie oznacza przypisania kampanii ani współczynnika konwersji/)).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("key-events-desktop.png"), fullPage: true });

    for (const width of [360, 320]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.getByRole("link", { name: "Dziś" }).focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "7 dni" })).toBeFocused();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`key-events-${width}.png`), fullPage: true });
    }

    await page.goto(`/admin/key-events?${range}&scope=diagnostic`);
    await expect(page.getByRole("heading", { name: "Wyniki: 5 zdarzeń" })).toBeVisible();
    await page.goto("/admin/key-events?range=custom&from=2032-04-11&to=2032-04-11");
    await expect(page.getByText("Brak Key Events w tym zakresie.")).toBeVisible();
    await page.goto("/admin/key-events?range=custom&from=2032-04-11&to=2032-04-10");
    await expect(page.getByRole("heading", { name: "Nieprawidłowy zakres dat" })).toBeVisible();
  } finally {
    const quoted = (values: string[]) => values.map((id) => `'${id}'`).join(",");
    const sql = `begin; delete from public.analytics_events_v2 where event_id in (${quoted(eventIds)}); delete from public.analytics_sessions_v2 where session_id = '${sessionId}'; delete from public.analytics_cookieless_events where event_id in (${quoted(cookielessIds)}); commit;`;
    execFileSync("docker", ["exec", "supabase_db_pozanuta-social", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], { stdio: "pipe" });
  }
});
