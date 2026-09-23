"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ANALYTICS_INTERNAL_COOKIE, ANALYTICS_TEST_COOKIE, signAnalyticsToken } from "@/lib/analytics-token";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function excludeDeviceAction() {
  await requireAdmin();
  const maxAge = 365 * 24 * 60 * 60;
  const token = await signAnalyticsToken("internal", { enabled: true as const, exp: Math.floor(Date.now() / 1000) + maxAge });
  if (token) (await cookies()).set(ANALYTICS_INTERNAL_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge, path: "/" });
}

export async function enableAnalyticsTestModeAction() {
  await requireAdmin();
  const maxAge = 2 * 60 * 60;
  const token = await signAnalyticsToken("test", { enabled: true as const, exp: Math.floor(Date.now() / 1000) + maxAge });
  if (token) (await cookies()).set(ANALYTICS_TEST_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge, path: "/" });
}

export async function disableAnalyticsTestModeAction() {
  await requireAdmin();
  (await cookies()).set(ANALYTICS_TEST_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" });
}
