import { expect, test } from "@playwright/test";
import { loginWithMagicEmail } from "./helpers/local-admin-auth";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

const email = process.env.LOCAL_ADMIN_E2E_EMAIL;
const mailpit = process.env.LOCAL_MAILPIT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const range = "range=custom&from=2035-04-10&to=2035-04-10";

test("Segments uses consented session base, overlap and bounded read states", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!email || !mailpit || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires local Supabase/Auth/Mailpit");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  await page.goto(`/admin/segments?${range}`);
  await expect(page).toHaveURL(/\/admin\/login/);

  await loginWithMagicEmail(page, request, email!);
  await expect(page).not.toHaveURL(/\/admin\/login/);

  const sessions = [crypto.randomUUID(), crypto.randomUUID()];
  const events = Array.from({ length: 5 }, () => crypto.randomUUID());
  const cookieless = Array.from({ length: 2 }, () => crypto.randomUUID());
  const noError = (error: { message: string } | null) => expect(error?.message ?? null).toBeNull();
  const dbSql = (sql: string) => execFileSync("docker", ["exec", "supabase_db_pozanuta-social", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], { stdio: "pipe" });
  let rpcRevoked = false;
  try {
    noError((await admin.from("analytics_sessions_v2").insert(sessions.map((session_id) => ({ session_id, environment: "production", traffic_class: "external", analytics_consent: true })))).error);
    noError((await admin.from("analytics_events_v2").insert([
      { event_id: events[0], event_name: "page_view", occurred_at: "2035-04-10T10:00:00Z", session_id: sessions[0], session_sequence: 1, environment: "production", traffic_class: "external", analytics_consent: true, path: "/" },
      { event_id: events[1], event_name: "contact_click", occurred_at: "2035-04-10T10:01:00Z", session_id: sessions[0], session_sequence: 2, environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt" },
      { event_id: events[2], event_name: "contact_click", occurred_at: "2035-04-10T10:02:00Z", session_id: sessions[0], session_sequence: 3, environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt" },
      { event_id: events[3], event_name: "outbound_click", occurred_at: "2035-04-10T10:03:00Z", session_id: sessions[0], session_sequence: 4, environment: "production", traffic_class: "external", analytics_consent: true, path: "/go/instagram" },
      { event_id: events[4], event_name: "contact_click", occurred_at: "2035-04-10T10:04:00Z", session_id: sessions[1], session_sequence: 1, environment: "preview", traffic_class: "test", analytics_consent: true, path: "/kontakt" },
    ])).error);
    noError((await admin.from("analytics_cookieless_events").insert(cookieless.map((event_id) => ({ event_id, project_key: "poza_nuta", event_name: "contact_click", occurred_at: "2035-04-10T10:05:00Z", environment: "production", traffic_class: "external", path: "/kontakt" })))).error);

    await page.goto(`/admin/segments?${range}&segment=contact_click`);
    await expect(page.getByRole("heading", { name: "Segmenty sesji" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Populacja bazowa" }).locator("..")).toContainText("1");
    await expect(page.getByRole("heading", { name: "Wybrany segment: Sesje z kliknięciem kontaktu" }).locator("..")).toBeVisible();
    await expect(page.getByText("100% bazy")).toHaveCount(3);
    await expect(page.getByText("Tylko sesje consented.")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("segments-desktop.png"), fullPage: true });
    for (const width of [360, 320]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("link", { name: "Dziś" }).focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "7 dni" })).toBeFocused();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`segments-${width}.png`), fullPage: true });
    }
    await page.goto(`/admin/segments?${range}&scope=diagnostic&segment=contact_click`);
    await expect(page.getByRole("heading", { name: "Populacja bazowa" }).locator("..")).toContainText("2");
    await page.goto(`/admin/segments?${range}&segment=arbitrary`);
    await expect(page.getByRole("main").getByText("Nieznany segment. Pokazujemy domyślny preset.")).toBeVisible();
    await page.goto("/admin/segments?range=custom&from=2035-04-11&to=2035-04-11");
    await expect(page.getByRole("main").getByText(/Brak kwalifikujących sesji/).last()).toBeVisible();
    await expect(page.getByText("Brak bazy")).toHaveCount(5);
    await page.goto("/admin/segments?range=custom&from=2035-04-11&to=2035-04-10");
    await expect(page.getByRole("heading", { name: "Nieprawidłowy zakres dat" })).toBeVisible();
    dbSql("revoke execute on function public.analytics_consented_segments_v1(text,date,date,text,text) from service_role");
    rpcRevoked = true;
    await page.goto(`/admin/segments?${range}`);
    await expect(page.getByRole("heading", { name: "Odczyt segmentów niedostępny" })).toBeVisible();
  } finally {
    if (rpcRevoked) dbSql("grant execute on function public.analytics_consented_segments_v1(text,date,date,text,text) to service_role");
    dbSql(`begin; delete from public.analytics_events_v2 where event_id in (${events.map((id) => `'${id}'`).join(",")}); delete from public.analytics_sessions_v2 where session_id in (${sessions.map((id) => `'${id}'`).join(",")}); delete from public.analytics_cookieless_events where event_id in (${cookieless.map((id) => `'${id}'`).join(",")}); commit;`);
  }
});
