import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const localKey = process.env.SUPABASE_SECRET_KEY;

test("local consent evidence records grant and withdrawal without request metadata", async ({ browser }) => {
  test.skip(!localUrl?.startsWith("http://127.0.0.1:") || !localKey, "Requires isolated local Supabase");
  const db = createClient(localUrl!, localKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const grant = await context.request.post("/api/consent", { data: { analytics: true } });
  expect(grant.status()).toBe(200);
  const visitorCookie = (await context.cookies()).find((cookie) => cookie.name === "pn_visitor");
  expect(visitorCookie).toBeTruthy();
  const visitorId = JSON.parse(Buffer.from(visitorCookie!.value.split(".")[0], "base64url").toString("utf8")).id as string;
  const { data: granted, error: grantError } = await db.from("analytics_consent_evidence").select("*").eq("visitor_id", visitorId).order("occurred_at", { ascending: true });
  expect(grantError).toBeNull();
  expect(granted?.map((row) => row.analytics_enabled)).toEqual([true]);
  expect(granted?.[0].consent_version).toBe(2);
  expect(granted?.[0].environment).toBe(process.env.VERCEL_ENV === "preview" ? "preview" : "production");
  expect(Object.keys(granted![0]).sort()).toEqual(["analytics_enabled", "consent_version", "environment", "expires_at", "id", "occurred_at", "visitor_id"]);

  const withdraw = await context.request.post("/api/consent", { data: { analytics: false } });
  expect(withdraw.status()).toBe(200);
  expect((await context.cookies()).some((cookie) => ["pn_visitor", "pn_session", "pn_acquisition"].includes(cookie.name))).toBe(false);
  const { data: evidence, error } = await db.from("analytics_consent_evidence").select("analytics_enabled,environment").eq("visitor_id", visitorId).order("occurred_at", { ascending: true });
  expect(error).toBeNull();
  expect(evidence?.map((row) => row.analytics_enabled)).toEqual([true, false]);
  expect(evidence?.every((row) => row.environment === (process.env.VERCEL_ENV === "preview" ? "preview" : "production"))).toBe(true);
  await context.close();
});
