import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { ANALYTICS_PROJECT_KEY } from "../../src/lib/analytics-project";

const email = process.env.LOCAL_ADMIN_E2E_EMAIL;
const mailpit = process.env.LOCAL_MAILPIT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const from = "2031-01-10";
const range = `range=custom&from=${from}&to=${from}`;

test("Acquisition is guarded, scoped, readable and responsive", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!email || !mailpit || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires local Supabase/Auth/Mailpit");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  await page.goto(`/admin/acquisition?${range}`);
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

  const campaignId = crypto.randomUUID();
  const assetId = crypto.randomUUID();
  const secondAssetId = crypto.randomUUID();
  const placementId = crypto.randomUUID();
  const secondPlacementId = crypto.randomUUID();
  const linkId = crypto.randomUUID();
  const secondLinkId = crypto.randomUUID();
  const emptyCampaignId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const directId = crypto.randomUUID();
  const noContextId = crypto.randomUUID();
  const technicalId = crypto.randomUUID();
  const persistedId = crypto.randomUUID();
  const slug = `acquisition-e2e-${campaignId.slice(0,8)}`;
  const assertNoError = (error: { message: string } | null) => expect(error?.message ?? null).toBeNull();

  try {
    assertNoError((await admin.from("campaigns").insert({ id: campaignId, name: "Kampania testowa Acquisition", slug, status: "archived" })).error);
    assertNoError((await admin.from("campaigns").insert({ id: emptyCampaignId, name: "Pusta kampania Acquisition", slug: `empty-${campaignId.slice(0,8)}`, status: "draft" })).error);
    assertNoError((await admin.from("analytics_assets").insert({ id: assetId, campaign_id: campaignId, slug: "poster", label: "Plakat A", active: false })).error);
    assertNoError((await admin.from("analytics_assets").insert({ id: secondAssetId, campaign_id: campaignId, slug: "story", label: "Story B" })).error);
    assertNoError((await admin.from("analytics_placements").insert({ id: placementId, slug: `door-${campaignId.slice(0,8)}`, label: "Wejście lokalu", active: false })).error);
    assertNoError((await admin.from("analytics_placements").insert({ id: secondPlacementId, slug: `table-${campaignId.slice(0,8)}`, label: "Stolik lokalu" })).error);
    assertNoError((await admin.from("tracking_links").insert({ id: linkId, code: "ZXCVA", label: "Plakat przy wejściu", campaign_id: campaignId, asset_id: assetId, placement_id: placementId, active: false })).error);
    assertNoError((await admin.from("tracking_links").insert({ id: secondLinkId, code: "WXCVB", label: "Story przy stoliku", campaign_id: campaignId, asset_id: secondAssetId, placement_id: secondPlacementId })).error);
    assertNoError((await admin.from("analytics_sessions_v2").insert({ session_id: sessionId, environment: "production", traffic_class: "external", analytics_consent: true })).error);
    assertNoError((await admin.from("analytics_cookieless_events").insert([
      { event_id: directId, project_key: ANALYTICS_PROJECT_KEY, event_name: "tracking_entry", occurred_at: "2031-01-10T10:00:00Z", environment: "production", traffic_class: "external", path: "/r/ZXCVA", campaign_id: campaignId, asset_id: assetId, placement_id: placementId, tracking_link_id: linkId },
      { event_id: noContextId, project_key: ANALYTICS_PROJECT_KEY, event_name: "page_view", occurred_at: "2031-01-10T10:00:01Z", environment: "production", traffic_class: "external", path: "/", utm_campaign: slug },
      { event_id: technicalId, project_key: ANALYTICS_PROJECT_KEY, event_name: "tracking_entry", occurred_at: "2031-01-10T10:00:02Z", environment: "preview", traffic_class: "external", path: "/r/ZXCVA", campaign_id: campaignId, asset_id: assetId, placement_id: placementId, tracking_link_id: linkId },
    ])).error);
    assertNoError((await admin.from("analytics_events_v2").insert({ event_id: persistedId, event_name: "contact_click", occurred_at: "2031-01-10T10:00:03Z", session_id: sessionId, session_sequence: 1, environment: "production", traffic_class: "external", analytics_consent: true, path: "/kontakt", observed_context: {}, attributed_context: { campaignId, assetId, placementId, trackingLinkId: linkId } })).error);

    await page.goto(`/admin/acquisition?${range}`);
    await expect(page.getByRole("heading", { name: "Pozyskanie i kampanie" })).toBeVisible();
    await expect(page.getByText("Bez kontekstu kampanii")).toBeVisible();
    const campaign = page.getByRole("link", { name: /Kampania testowa Acquisition/ });
    await expect(campaign).toContainText("Archiwalna");
    await expect(campaign).toContainText("1");
    await campaign.click();
    await expect(page.getByRole("heading", { name: "Materiały i użycia" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Plakat A" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Story B" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wejście lokalu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stolik lokalu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Plakat przy wejściu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Story przy stoliku" })).toBeVisible();
    await expect(page.getByText("Wyłączony")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("acquisition-desktop.png"), fullPage: true });

    for (const width of [360, 320]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      if (width === 360) await page.screenshot({ path: testInfo.outputPath("acquisition-360.png"), fullPage: true });
    }
    await page.goto(`/admin/acquisition/${campaignId}?${range}&scope=diagnostic`);
    await expect(page.getByText("Diagnostyka: wszystkie przyjęte zdarzenia").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Plakat A" })).toBeVisible();
    await page.goto(`/admin/acquisition/${emptyCampaignId}?${range}`);
    await expect(page.getByRole("main").getByText(/nie ma jeszcze materiałów ani linków/)).toBeVisible();
    await page.goto(`/admin/acquisition?${range}`);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("link", { name: /Pusta kampania Acquisition/ })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  } finally {
    // The service role intentionally cannot delete append-only analytics rows.
    // This spec runs only against the confirmed local Supabase Docker target.
    const sql = `begin;
      delete from public.analytics_events_v2 where event_id = '${persistedId}';
      delete from public.analytics_sessions_v2 where session_id = '${sessionId}';
      delete from public.analytics_cookieless_events where event_id in ('${directId}','${noContextId}','${technicalId}');
      delete from public.tracking_links where id in ('${linkId}','${secondLinkId}');
      delete from public.analytics_placements where id in ('${placementId}','${secondPlacementId}');
      delete from public.analytics_assets where id in ('${assetId}','${secondAssetId}');
      delete from public.campaigns where id in ('${campaignId}','${emptyCampaignId}');
      commit;`;
    execFileSync("docker", ["exec", "supabase_db_pozanuta-social", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], { stdio: "pipe" });
  }
});
