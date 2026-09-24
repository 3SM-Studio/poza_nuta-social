import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

const email = process.env.LOCAL_ADMIN_E2E_EMAIL;
const mailpit = process.env.LOCAL_MAILPIT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const range = "range=custom&from=2032-04-08&to=2032-04-08";

test("Paths is admin-only, session-scoped, and usable at narrow widths", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!email || !mailpit || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires local Supabase/Auth/Mailpit");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  await page.goto(`/admin/paths?${range}`);
  await expect(page).toHaveURL(/\/admin\/login/);

  const before = await (await request.get(`${mailpit}/api/v1/messages`)).json() as { messages?: Array<{ ID?: string }> };
  const existing = new Set(before.messages?.map((message) => message.ID).filter(Boolean));
  await page.getByLabel("E-mail").fill(email!);
  await page.getByRole("button", { name: "Wyślij magic link" }).click();
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

  const sessions = [crypto.randomUUID(), crypto.randomUUID()];
  const cookieless = [crypto.randomUUID(), crypto.randomUUID()];
  const events = [
    { event_id: crypto.randomUUID(), event_name: "page_view", occurred_at: "2032-04-08T10:00:00Z", session_id: sessions[0], session_sequence: 1, environment: "production", traffic_class: "external", analytics_consent: true, path: "/" },
    { event_id: crypto.randomUUID(), event_name: "page_view", occurred_at: "2032-04-08T10:00:00Z", session_id: sessions[0], session_sequence: 2, environment: "production", traffic_class: "external", analytics_consent: true, path: "/" },
    { event_id: crypto.randomUUID(), event_name: "page_view", occurred_at: "2032-04-08T10:01:00Z", session_id: sessions[0], session_sequence: 3, environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt" },
    { event_id: crypto.randomUUID(), event_name: "page_view", occurred_at: "2032-04-08T11:00:00Z", session_id: sessions[1], session_sequence: 1, environment: "preview", traffic_class: "external", analytics_consent: true, path: "/linki" },
  ];
  const noError = (error: { message: string } | null) => expect(error?.message ?? null).toBeNull();
  try {
    noError((await admin.from("analytics_sessions_v2").insert(sessions.map((session_id) => ({ session_id, environment: "production", traffic_class: "external", analytics_consent: true })))).error);
    noError((await admin.from("analytics_events_v2").insert(events)).error);
    noError((await admin.from("analytics_cookieless_events").insert(cookieless.map((event_id, i) => ({ event_id, project_key: "poza_nuta", event_name: "page_view", occurred_at: `2032-04-08T12:0${i}:00Z`, environment: "production", traffic_class: "external", path: i ? "/kontakt" : "/" })))).error);

    await page.goto(`/admin/paths?${range}`);
    await expect(page.getByRole("heading", { name: "Ścieżki stron" })).toBeVisible();
    await expect(page.getByText("1 sesji z odsłoną strony")).toBeVisible();
    await expect(page.getByText("/ → / → /kontakt")).toBeVisible();
    await page.getByRole("link", { name: "/", exact: true }).first().click();
    await expect(page.getByText("Wybrana strona:")).toContainText("1 sesji");
    await expect(page.getByText("Brak kolejnej obserwowanej strony w zakresie dla wybranego węzła.")).toHaveCount(0);
    await expect(page.getByText(/To nie jest exit/)).toBeVisible();
    await page.getByRole("navigation", { name: "Wybierz stronę do analizy" }).getByRole("link", { name: "/kontakt" }).click();
    await expect(page.getByText("Brak kolejnej obserwowanej strony w zakresie dla wybranego węzła.")).toBeVisible();
    await expect(page.getByText(/1 sesji bez kolejnej obserwowanej strony w zakresie/)).toBeVisible();
    await page.getByRole("navigation", { name: "Wybierz stronę do analizy" }).getByRole("link", { name: "/dla-lokali" }).click();
    await expect(page.getByText(/Ta strona nie występuje w wybranym okresie/)).toBeVisible();
    await page.getByRole("navigation", { name: "Wybierz stronę do analizy" }).getByRole("link", { name: "/", exact: true }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("paths-desktop.png"), fullPage: true });

    for (const width of [360, 320]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.getByRole("link", { name: "Dziś" }).focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "7 dni" })).toBeFocused();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`paths-${width}.png`), fullPage: true });
    }
    await page.goto(`/admin/paths?${range}&scope=diagnostic`);
    await expect(page.getByText("2 sesji z odsłoną strony").first()).toBeVisible();
    await page.goto("/admin/paths?range=custom&from=2032-04-09&to=2032-04-09");
    await expect(page.getByText(/Brak sesji consented z odsłoną strony/)).toBeVisible();
    await page.goto("/admin/paths?path=%2Fkontakt%3Bdrop%20table%20x");
    await expect(page.getByRole("heading", { name: "Nieprawidłowa strona" })).toBeVisible();
  } finally {
    const quoted = (values: string[]) => values.map((id) => `'${id}'`).join(",");
    const sql = `begin; delete from public.analytics_events_v2 where event_id in (${quoted(events.map((event) => event.event_id))}); delete from public.analytics_sessions_v2 where session_id in (${quoted(sessions)}); delete from public.analytics_cookieless_events where event_id in (${quoted(cookieless)}); commit;`;
    execFileSync("docker", ["exec", "supabase_db_pozanuta-social", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], { stdio: "pipe" });
  }
});
