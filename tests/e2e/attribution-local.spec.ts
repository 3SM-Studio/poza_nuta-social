import { expect, test } from "@playwright/test";
import { loginWithMagicEmail } from "./helpers/local-admin-auth";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

const email = process.env.LOCAL_ADMIN_E2E_EMAIL;
const mailpit = process.env.LOCAL_MAILPIT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const range = "range=custom&from=2034-03-10&to=2034-03-10";

test("Attribution is guarded and explains event credit across modes and scopes", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!email || !mailpit || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires local Supabase/Auth/Mailpit");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  await page.goto(`/admin/attribution?${range}`);
  await expect(page).toHaveURL(/\/admin\/login/);

  await loginWithMagicEmail(page, request, email!);
  await expect(page).not.toHaveURL(/\/admin\/login/);

  const campaignId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const events = Array.from({ length: 5 }, () => crypto.randomUUID());
  const cookieless = Array.from({ length: 4 }, () => crypto.randomUUID());
  const noError = (error: { message: string } | null) => expect(error?.message ?? null).toBeNull();
  const dbSql = (sql: string) => execFileSync("docker", ["exec","supabase_db_pozanuta-social","psql","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-c",sql], { stdio: "pipe" });
  let rpcRevoked = false;
  try {
    noError((await admin.from("campaigns").insert({ id: campaignId, name: "Kampania Attribution E2E", slug: `attr-e2e-${campaignId.slice(0,8)}`, status: "archived" })).error);
    noError((await admin.from("analytics_sessions_v2").insert({ session_id: sessionId, environment: "production", traffic_class: "external", analytics_consent: true })).error);
    noError((await admin.from("analytics_events_v2").insert([
      { event_id: events[0], event_name: "contact_click", occurred_at: "2034-03-10T10:00:00Z", session_id: sessionId, session_sequence: 1, environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt", observed_context: { source: "direct" }, attributed_context: { source: "poster", campaignId } },
      { event_id: events[1], event_name: "outbound_click", occurred_at: "2034-03-10T10:01:00Z", session_id: sessionId, session_sequence: 2, environment: "production", traffic_class: "external", analytics_consent: true, path: "/go/instagram", destination_id: (await admin.from("destinations").select("id").eq("slug","instagram").single()).data?.id, destination_slug: "instagram", observed_context: { source: "poster", campaignId }, attributed_context: { source: "other" } },
      { event_id: events[2], event_name: "contact_click", occurred_at: "2034-03-10T10:02:00Z", session_id: sessionId, session_sequence: 3, environment: "preview", traffic_class: "external", analytics_consent: true, path: "/kontakt", observed_context: {}, attributed_context: {} },
      { event_id: events[3], event_name: "contact_click", occurred_at: "2034-03-12T10:00:00Z", session_id: sessionId, session_sequence: 4, environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt", observed_context: { source: "poster", campaignId }, attributed_context: {} },
      { event_id: events[4], event_name: "contact_click", occurred_at: "2034-03-14T10:00:00Z", session_id: sessionId, session_sequence: 5, environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt", observed_context: { source: "direct" }, attributed_context: { source: "poster", campaignId } },
    ])).error);
    noError((await admin.from("analytics_cookieless_events").insert([
      { event_id: cookieless[0], project_key: "poza_nuta", event_name: "contact_click", occurred_at: "2034-03-10T10:03:00Z", environment: "production", traffic_class: "external", path: "/kontakt" },
      { event_id: cookieless[1], project_key: "poza_nuta", event_name: "contact_click", occurred_at: "2034-03-10T10:04:00Z", environment: "production", traffic_class: "external", path: "/kontakt", utm_source: "newsletter" },
      { event_id: cookieless[2], project_key: "poza_nuta", event_name: "contact_click", occurred_at: "2034-03-11T10:00:00Z", environment: "production", traffic_class: "external", path: "/kontakt" },
      { event_id: cookieless[3], project_key: "poza_nuta", event_name: "contact_click", occurred_at: "2034-03-13T10:00:00Z", environment: "production", traffic_class: "external", path: "/kontakt", utm_source: "newsletter" },
    ])).error);

    await page.goto(`/admin/attribution?${range}`);
    await expect(page.getByRole("heading", { name: "Attribution", exact: true })).toBeVisible();
    await expect(page.getByText("Kampania Attribution E2E")).toHaveCount(1);
    await expect(page.getByText("75%")).toBeVisible();
    await expect(page.getByText(/To miara kompletności przypisania, nie conversion rate/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Unattributed" })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("attribution-desktop.png"), fullPage: true });
    for (const width of [360,320]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("link", { name: "Dziś" }).focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "7 dni" })).toBeFocused();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`attribution-${width}.png`), fullPage: true });
    }
    await page.goto(`/admin/attribution?${range}&scope=diagnostic`);
    await expect(page.getByRole("main").getByText("60%").first()).toBeVisible();
    await page.goto("/admin/attribution?range=custom&from=2034-03-11&to=2034-03-11");
    await expect(page.getByRole("main").getByText("0%").first()).toBeVisible();
    await expect(page.getByText("Direct: 0").first()).toBeVisible();
    await page.goto("/admin/attribution?range=custom&from=2034-03-12&to=2034-03-12");
    await expect(page.getByRole("main").getByText("100%").first()).toBeVisible();
    await page.goto("/admin/attribution?range=custom&from=2034-03-13&to=2034-03-13");
    await expect(page.getByRole("main").getByText("100%").first()).toBeVisible();
    await expect(page.getByText("Direct: 1").first()).toBeVisible();
    await page.goto("/admin/attribution?range=custom&from=2034-03-14&to=2034-03-14");
    await expect(page.getByRole("main").getByText("100%").first()).toBeVisible();
    await expect(page.getByText("Persisted: 1").first()).toBeVisible();
    await page.goto("/admin/attribution?range=custom&from=2034-03-15&to=2034-03-15");
    await expect(page.getByText("Brak Key Events w tym zakresie.")).toBeVisible();
    await page.goto("/admin/attribution?range=custom&from=2034-03-11&to=2034-03-10");
    await expect(page.getByRole("heading", { name: "Nieprawidłowy zakres dat" })).toBeVisible();
    dbSql("revoke execute on function public.analytics_deterministic_attribution_v1(text,date,date,text) from service_role;");
    rpcRevoked = true;
    await page.goto(`/admin/attribution?${range}`);
    await expect(page.getByRole("heading", { name: "Odczyt Attribution niedostępny" })).toBeVisible();
  } finally {
    if (rpcRevoked) dbSql("grant execute on function public.analytics_deterministic_attribution_v1(text,date,date,text) to service_role;");
    const q = (ids: string[]) => ids.map((id) => `'${id}'`).join(",");
    const sql = `begin; delete from public.analytics_events_v2 where event_id in (${q(events)}); delete from public.analytics_sessions_v2 where session_id='${sessionId}'; delete from public.analytics_cookieless_events where event_id in (${q(cookieless)}); delete from public.campaigns where id='${campaignId}'; commit;`;
    dbSql(sql);
  }
});
