import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const mailpitUrl = process.env.LOCAL_MAILPIT_URL;
const magicLinkPattern = /https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/;

type MailMessage = { ID?: string; Subject?: string; To?: Array<{ Address?: string }> };

async function mailbox(request: APIRequestContext) {
  if (!mailpitUrl) throw new Error("Local Mailpit is required");
  const response = await request.get(`${mailpitUrl}/api/v1/messages`);
  if (!response.ok()) throw new Error(`Mailpit list failed: ${response.status()}`);
  return (await response.json() as { messages?: MailMessage[] }).messages ?? [];
}

export async function mailMessageIds(request: APIRequestContext) {
  return new Set((await mailbox(request)).map((message) => message.ID).filter((id): id is string => Boolean(id)));
}

export async function newMessageUrl(
  request: APIRequestContext,
  previousIds: Set<string>,
  pattern: RegExp,
  recipient: string,
  subject?: string,
) {
  let messageId: string | undefined;
  await expect.poll(async () => {
    messageId = (await mailbox(request)).find((message) => message.ID && !previousIds.has(message.ID)
      && message.To?.some((address) => address.Address?.toLowerCase() === recipient.toLowerCase())
      && (!subject || message.Subject === subject))?.ID;
    return messageId;
  }, { timeout: 10_000 }).toBeTruthy();

  const response = await request.get(`${mailpitUrl}/api/v1/message/${messageId}`);
  if (!response.ok()) throw new Error(`Mailpit message failed: ${response.status()}`);
  const message = await response.json() as { HTML?: string; Text?: string };
  const body = `${message.HTML || ""}\n${message.Text || ""}`.replaceAll("&amp;", "&");
  const url = body.match(pattern)?.[0];
  if (!url) throw new Error(`Expected URL was not found in the new email to ${recipient}`);
  return url;
}

export async function requestMagicLink(page: Page, request: APIRequestContext, email: string) {
  const previousIds = await mailMessageIds(request);
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Wyślij magic link" }).click();
  await expect(page.getByText(/Link do logowania został wysłany/)).toBeVisible();
  return newMessageUrl(request, previousIds, magicLinkPattern, email, "Your sign-in link");
}

export async function loginWithMagicEmail(page: Page, request: APIRequestContext, email: string) {
  const magicUrl = await requestMagicLink(page, request, email);
  // The same browser page must retain the PKCE verifier set by the login form.
  await page.goto(magicUrl);
}

export async function createLocalAuthUser(admin: SupabaseClient, email: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message || `Unable to create ${email}`);
  return { id: data.user.id, email };
}

export async function createLocalTeamMember(admin: SupabaseClient, label: string, ownerId: string, ownerEmail: string) {
  const email = `${label}-${randomUUID()}@pozanuta.test`;
  const user = await createLocalAuthUser(admin, email);
  const { error } = await admin.from("admin_profiles").insert({ user_id: user.id, email, role: "admin", status: "active" });
  if (error) {
    await admin.auth.admin.deleteUser(user.id);
    throw new Error(error.message);
  }
  return {
    ...user,
    async cleanup() {
      // Membership removal is audited as deactivation; the table has no DELETE grant.
      const { error: profileError } = await admin.rpc("admin_member_update_v1", {
        p_actor_user_id: ownerId,
        p_actor_email: ownerEmail,
        p_target_user_id: user.id,
        p_role: "admin",
        p_status: "inactive",
      });
      if (profileError) throw new Error(profileError.message);
    },
  };
}
