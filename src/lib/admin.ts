import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getBootstrapOwnerEmail } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminRole = "owner" | "admin" | "viewer";
export type AdminAccess = { user: User; role: AdminRole };

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) return null;

  const claimsEmail = typeof claimsData.claims.email === "string"
    ? claimsData.claims.email.trim().toLowerCase()
    : null;
  const claimsSubject = typeof claimsData.claims.sub === "string" ? claimsData.claims.sub : null;
  if (!claimsEmail || !claimsSubject) return null;

  // Fetch the Auth user only after locally verified claims, then bind both immutable ID and email.
  const { data, error } = await supabase.auth.getUser();
  const userEmail = data.user?.email?.trim().toLowerCase();
  if (error || !data.user || data.user.id !== claimsSubject || userEmail !== claimsEmail) return null;
  return data.user;
}

export async function getAdminAccess(): Promise<AdminAccess | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  return reconcileAdminMembership(user);
}

export async function getAdminUser() {
  return (await getAdminAccess())?.user || null;
}

export async function reconcileAdminMembership(user: User): Promise<AdminAccess | null> {
  const admin = createAdminClient();
  const email = user.email?.trim().toLowerCase();
  if (!admin || !email) return null;

  const existing = await readActiveMembership(admin, user.id);
  if (existing) return { user, role: existing };

  if (getBootstrapOwnerEmail() === email) {
    await admin.rpc("admin_bootstrap_owner_v1", {
      p_user_id: user.id,
      p_email: email,
    });
    const bootstrapped = await readActiveMembership(admin, user.id);
    if (bootstrapped) return { user, role: bootstrapped };
  }

  // Acceptance is idempotent. The database alone decides whether a live invitation exists.
  await admin.rpc("admin_invitation_accept_v1", {
    p_user_id: user.id,
    p_email: email,
  });
  const accepted = await readActiveMembership(admin, user.id);
  return accepted ? { user, role: accepted } : null;
}

export async function requireAdmin() {
  return (await requireAdminAccess()).user;
}

export async function requireAdminAccess() {
  const access = await getAdminAccess();
  if (!access) redirect("/admin/login");
  return access;
}

export async function requireEditor() {
  const access = await requireAdminAccess();
  if (!canMutateAdmin(access.role)) redirect("/admin?error=forbidden");
  return access.user;
}

export async function requireOwner() {
  const access = await requireAdminAccess();
  if (access.role !== "owner") redirect("/admin?error=forbidden");
  return access;
}

export function canMutateAdmin(role: AdminRole) {
  return role === "owner" || role === "admin";
}

export function canManageTeam(role: AdminRole) {
  return role === "owner";
}

export function isAdminRole(value: unknown): value is AdminRole {
  return value === "owner" || value === "admin" || value === "viewer";
}

async function readActiveMembership(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
) {
  const { data, error } = await admin
    .from("admin_profiles")
    .select("role")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return !error && isAdminRole(data?.role) ? data.role : null;
}
