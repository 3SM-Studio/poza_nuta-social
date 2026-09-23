"use server";

import { redirect } from "next/navigation";
import { isAdminLoginEligible, type AdminLoginLookup } from "@/lib/admin-login-policy";
import { getBootstrapOwnerEmail, getSiteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function sendMagicLinkAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/admin/login?error=invalid-email");

  const admin = createAdminClient();
  const supabase = await createSupabaseServerClient();
  if (!admin || !supabase) redirect("/admin/login?error=not-configured");

  const eligible = await isAdminLoginEligible(email, getBootstrapOwnerEmail(), createLookup(admin));
  // Keep the public response identical for unauthorized and eligible addresses.
  if (!eligible) redirect("/admin/login?sent=1");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/callback`, shouldCreateUser: false },
  });
  if (error) redirect("/admin/login?error=send-failed");
  redirect("/admin/login?sent=1");
}

function createLookup(admin: NonNullable<ReturnType<typeof createAdminClient>>): AdminLoginLookup {
  return {
    async hasActiveMembership(email) {
      const { count, error } = await admin
        .from("admin_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("email", email)
        .eq("status", "active");
      return !error && (count || 0) > 0;
    },
    async hasPendingInvitation(email) {
      const { count, error } = await admin
        .from("admin_invitations")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());
      return !error && (count || 0) > 0;
    },
    async hasActiveOwner() {
      const { count, error } = await admin
        .from("admin_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "owner")
        .eq("status", "active");
      return error ? true : (count || 0) > 0;
    },
  };
}
