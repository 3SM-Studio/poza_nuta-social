import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const adminEmail = process.env.LOCAL_ADMIN_E2E_EMAIL;
const mailpitUrl = process.env.LOCAL_MAILPIT_URL;
const screenshotDir = process.env.LOCAL_E2E_SCREENSHOT_DIR;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe.configure({ mode: "serial" });

test("local owner can authenticate and complete the campaign-to-QR flow", async ({ browser, page, request }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!adminEmail || !mailpitUrl || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires the isolated local Supabase/Auth/Mailpit stack");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const runId = Date.now().toString(36);
  const campaignName = `Lokalny test E2E ${runId}`;
  const campaignSlug = `lokalny-test-e2e-${runId}`;
  const linkLabel = `Plakat lokalny ${runId}`;

  await page.goto("/admin/login");
  await waitForHydration(page);
  await page.getByLabel("E-mail").fill(adminEmail!);
  await page.getByRole("button", { name: "Wyślij magic link" }).click();
  await expect(page.getByText(/Link do logowania został wysłany/)).toBeVisible();

  let messageId: string | null = null;
  await expect.poll(async () => {
    const response = await request.get(`${mailpitUrl}/api/v1/messages`);
    const mailbox = await response.json() as { messages?: Array<{ ID?: string }> };
    messageId = mailbox.messages?.[0]?.ID || null;
    return messageId;
  }, { timeout: 10_000 }).not.toBeNull();

  const messageResponse = await request.get(`${mailpitUrl}/api/v1/message/${messageId}`);
  const message = await messageResponse.json() as { HTML?: string; Text?: string };
  const messageBody = `${message.HTML || ""}\n${message.Text || ""}`.replaceAll("&amp;", "&");
  const magicUrl = messageBody.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/)?.[0];
  expect(magicUrl, "Mailpit message should contain a Supabase verification URL").toBeTruthy();

  await page.goto(magicUrl!);
  await waitForHydration(page);
  await expect(page.getByRole("heading", { name: "Co naprawdę działa?" })).toBeVisible();
  await expect(page.getByText("admin@pozanuta.test", { exact: true })).toBeVisible();
  expect((await page.context().cookies()).some((cookie) => cookie.name === "pn_internal" && cookie.httpOnly)).toBe(true);

  await page.getByRole("link", { name: "Kampanie" }).click();
  await waitForHydration(page);
  await page.getByLabel("Nazwa").fill(campaignName);
  await page.getByLabel("Slug (opcjonalny)").fill(campaignSlug);
  await page.getByRole("button", { name: "Utwórz kampanię" }).click();
  await expect(page.getByText(campaignSlug, { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Linki i QR" }).click();
  await waitForHydration(page);
  await page.getByLabel("Kampania").selectOption({ label: campaignName });
  await page.getByLabel("Asset").fill("pink-v2");
  await page.getByLabel("Placement").fill("entrance");
  await page.getByLabel("Nazwa").fill(linkLabel);
  await expect(page.getByLabel("Nazwa")).toHaveValue(linkLabel);
  await page.getByRole("button", { name: "Wygeneruj link i QR" }).click();
  await expect(page.getByRole("heading", { name: linkLabel })).toBeVisible();

  const trackingLinkSection = page.getByRole("heading", { name: linkLabel }).locator("xpath=../../..");
  const trackingUrl = await trackingLinkSection.locator("code").textContent();
  expect(trackingUrl).toBeTruthy();
  const trackingCode = trackingUrl!.split("/r/")[1];
  expect(trackingCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  const svgHref = await trackingLinkSection.getByRole("link", { name: "SVG" }).getAttribute("href");
  const svgResponse = await page.request.get(svgHref!);
  expect(svgResponse.ok()).toBeTruthy();
  expect(svgResponse.headers()["content-type"]).toContain("image/svg+xml");
  expect(await svgResponse.text()).toContain("<svg");

  await page.getByRole("link", { name: "Destynacje" }).click();
  await waitForHydration(page);
  await page.getByLabel("Slug").fill("website");
  await page.getByLabel("URL").fill("https://pozanuta.pl/");
  await page.getByLabel("Ikona").selectOption("globe");
  await page.getByLabel("Nazwa").fill("Poza Nutą");
  await expect(page.getByLabel("Nazwa")).toHaveValue("Poza Nutą");
  await page.getByRole("button", { name: "Zapisz destynację" }).click();
  await expect(page.getByText("website", { exact: true })).toBeVisible();

  const publicContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const publicPage = await publicContext.newPage();
  const firstPageView = publicPage.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().method() === "POST");
  await publicPage.goto(`/r/${trackingCode}`);
  await firstPageView;
  const laterPageView = publicPage.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().method() === "POST");
  await publicPage.goto("/?utm_source=instagram&utm_medium=social&utm_campaign=later-touch&utm_content=reel-a");
  await laterPageView;
  const outboundResponse = await publicContext.request.get("/go/instagram", { maxRedirects: 0 });
  expect(outboundResponse.status()).toBe(302);
  expect(outboundResponse.headers().location).toMatch(/^https:\/\/(www\.)?instagram\.com\//);
  await publicContext.close();

  await page.goto("/admin");
  await page.getByRole("button", { name: "Tryb testowy (2 h)" }).click();
  await expect.poll(async () => (await page.context().cookies()).some((cookie) => cookie.name === "pn_analytics_test" && cookie.httpOnly)).toBe(true);
  const testPageView = page.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "page_view");
  await page.goto("/");
  await testPageView;
  const testSessionCookie = (await page.context().cookies()).find((cookie) => cookie.name === "pn_session")!;
  const testSessionId = JSON.parse(Buffer.from(testSessionCookie.value.split(".")[0].replaceAll("-", "+").replaceAll("_", "/"), "base64url").toString("utf8")).id as string;
  await expect.poll(async () => {
    const { data } = await admin.from("analytics_events_v2").select("traffic_class").eq("session_id", testSessionId).eq("event_name", "page_view").order("id", { ascending: false }).limit(1).maybeSingle();
    return data?.traffic_class;
  }).toBe("test");
  await page.goto("/admin");
  await page.getByRole("button", { name: "Wyłącz tryb testowy" }).click();

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "zoom-200-equivalent", width: 720, height: 450 },
    { name: "mobile-390", width: 390, height: 844 },
    { name: "mobile-360", width: 360, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [route, heading] of [["/admin", "Co naprawdę działa?"], ["/admin/campaigns", "Kampanie"], ["/admin/links", "Linki i QR"], ["/admin/referrals", "Polecenia zespołu"], ["/admin/destinations", "Destynacje"], ["/admin/team", "Zespół i dostęp"]]) {
      await page.goto(route);
      await waitForHydration(page);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
      await testInfo.attach(`${viewport.name}-${route.replaceAll("/", "-") || "home"}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
      if (screenshotDir) {
        await page.screenshot({ path: join(screenshotDir, `${viewport.name}-${route.replaceAll("/", "-") || "home"}.png`), fullPage: true });
      }
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        offenders: [...document.querySelectorAll<HTMLElement>("body *")]
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return { tag: element.tagName, text: element.innerText?.slice(0, 60), left: rect.left, right: rect.right, width: rect.width, className: element.className };
          })
          .filter((element) => element.left < -1 || element.right > document.documentElement.clientWidth + 1)
          .slice(0, 8),
      }));
      expect(layout.overflow, `${route} should not overflow at ${viewport.width}px: ${JSON.stringify(layout.offenders)}`).toBeLessThanOrEqual(0);
    }
  }
});

test("database membership authorizes viewer and admin while rejecting inactive, non-member, and stale roles", async ({ browser, request }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!supabaseUrl || !serviceKey || !mailpitUrl || testInfo.project.name !== "desktop-chromium", "Requires the isolated local Supabase stack");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const suffix = Date.now().toString(36);
  const viewer = await createLocalAuthUser(admin, `viewer-${suffix}@pozanuta.test`);
  const activeAdmin = await createLocalAuthUser(admin, `operator-${suffix}@pozanuta.test`);
  const inactive = await createLocalAuthUser(admin, `inactive-${suffix}@pozanuta.test`);
  const nonmember = await createLocalAuthUser(admin, `nonmember-${suffix}@pozanuta.test`);
  const stale = await createLocalAuthUser(admin, `stale-${suffix}@pozanuta.test`);
  const { error: profilesError } = await admin.from("admin_profiles").insert([
    { user_id: viewer.id, email: viewer.email, role: "viewer", status: "active" },
    { user_id: activeAdmin.id, email: activeAdmin.email, role: "admin", status: "active" },
    { user_id: inactive.id, email: inactive.email, role: "admin", status: "active" },
    { user_id: stale.id, email: stale.email, role: "admin", status: "active" },
  ]);
  expect(profilesError).toBeNull();

  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await loginWithMagicEmail(viewerPage, request, viewer.email);
  await expect(viewerPage.getByRole("heading", { name: "Co naprawdę działa?" })).toBeVisible();
  await viewerPage.goto("/admin/campaigns");
  await expect(viewerPage.getByText(/Tryb tylko do odczytu/)).toBeVisible();
  await expect(viewerPage.getByRole("button", { name: "Utwórz kampanię" })).toHaveCount(0);
  await viewerPage.goto("/admin/team");
  await expect(viewerPage.getByText(/dostęp tylko do odczytu/i)).toBeVisible();
  await expect(viewerPage.getByRole("button", { name: "Zaproś osobę" })).toHaveCount(0);
  await viewerContext.close();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await loginWithMagicEmail(adminPage, request, activeAdmin.email);
  await adminPage.goto("/admin/campaigns");
  await expect(adminPage.getByRole("button", { name: "Utwórz kampanię" })).toBeVisible();
  await adminPage.goto("/admin/team");
  await adminPage.getByRole("button", { name: "Zaproś osobę" }).click();
  await expect(adminPage.getByLabel("Rola").locator("option")).toHaveCount(1);
  await adminPage.getByRole("button", { name: "Zamknij" }).click();
  await adminContext.close();

  const inactiveContext = await browser.newContext();
  const inactivePage = await inactiveContext.newPage();
  const inactiveLink = await requestMagicLink(inactivePage, request, inactive.email);
  const { error: inactiveError } = await admin.from("admin_profiles").update({ status: "inactive", deactivated_at: new Date().toISOString() }).eq("user_id", inactive.id);
  expect(inactiveError).toBeNull();
  await inactivePage.goto(inactiveLink);
  await expect(inactivePage).toHaveURL(/\/admin\/login\?error=access-denied/);
  await inactiveContext.close();

  const { data: ownerProfile } = await admin.from("admin_profiles").select("user_id").eq("role", "owner").eq("status", "active").single();
  const { data: nonmemberInvite, error: nonmemberInviteError } = await admin.from("admin_invitations").insert({
    email: nonmember.email,
    role: "viewer",
    invited_by: ownerProfile!.user_id,
    auth_user_id: nonmember.id,
    delivery_status: "existing_user",
  }).select("id").single();
  expect(nonmemberInviteError).toBeNull();
  const nonmemberContext = await browser.newContext();
  const nonmemberPage = await nonmemberContext.newPage();
  const nonmemberLink = await requestMagicLink(nonmemberPage, request, nonmember.email);
  const { error: revokeNonmemberError } = await admin.from("admin_invitations").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("id", nonmemberInvite!.id);
  expect(revokeNonmemberError).toBeNull();
  await nonmemberPage.goto(nonmemberLink);
  await expect(nonmemberPage).toHaveURL(/\/admin\/login\?error=access-denied/);
  await nonmemberContext.close();

  const staleContext = await browser.newContext();
  const stalePage = await staleContext.newPage();
  await loginWithMagicEmail(stalePage, request, stale.email);
  await stalePage.goto("/admin/campaigns");
  const staleSlug = `stale-role-${suffix}`;
  await stalePage.getByLabel("Nazwa").fill("Stale role rejected");
  await stalePage.getByLabel("Slug (opcjonalny)").fill(staleSlug);
  const { error: downgradeError } = await admin.from("admin_profiles").update({ role: "viewer" }).eq("user_id", stale.id);
  expect(downgradeError).toBeNull();
  await stalePage.getByRole("button", { name: "Utwórz kampanię" }).click();
  await expect(stalePage).toHaveURL(/\/admin\?error=forbidden/);
  const { count: staleCampaigns } = await admin.from("campaigns").select("id", { count: "exact", head: true }).eq("slug", staleSlug);
  expect(staleCampaigns).toBe(0);
  await staleContext.close();
});

test("Team and Access reconciles existing and new Auth users, role changes, deactivation, and revoke-before-accept", async ({ browser, page, request }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!adminEmail || !mailpitUrl || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires the isolated local Supabase/Auth/Mailpit stack");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const suffix = Date.now().toString(36);
  const existing = await createLocalAuthUser(admin, `existing-invite-${suffix}@pozanuta.test`);

  await loginWithMagicEmail(page, request, adminEmail!);
  await page.goto("/admin/team");
  await inviteFromTeamPage(page, existing.email, "viewer");
  await expect(page.getByText(/ma już konto i może użyć formularza logowania/i)).toBeVisible();
  const existingRow = page.getByRole("row").filter({ hasText: existing.email });
  await expect(existingRow).toContainText("Istniejące konto");

  const existingContext = await browser.newContext();
  const existingPage = await existingContext.newPage();
  await loginWithMagicEmail(existingPage, request, existing.email);
  await expect(existingPage.getByRole("heading", { name: "Co naprawdę działa?" })).toBeVisible();
  const { data: acceptedProfile } = await admin.from("admin_profiles").select("role,status").eq("user_id", existing.id).single();
  expect(acceptedProfile).toMatchObject({ role: "viewer", status: "active" });

  await page.reload();
  const acceptedRow = page.getByRole("row").filter({ hasText: existing.email });
  await acceptedRow.getByRole("button", { name: "Zmień rolę" }).click();
  await page.getByLabel("Rola").selectOption("admin");
  await page.getByRole("button", { name: "Zapisz rolę" }).click();
  await expect.poll(async () => (await admin.from("admin_profiles").select("role").eq("user_id", existing.id).single()).data?.role).toBe("admin");

  const promotedRow = page.getByRole("row").filter({ hasText: existing.email });
  await promotedRow.getByRole("button", { name: "Dezaktywuj" }).click();
  const deactivationDialog = page.getByRole("alertdialog");
  await deactivationDialog.getByRole("button", { name: "Dezaktywuj", exact: true }).click();
  await expect.poll(async () => (await admin.from("admin_profiles").select("status").eq("user_id", existing.id).single()).data?.status).toBe("inactive");
  await existingPage.goto("/admin");
  await expect(existingPage).toHaveURL(/\/admin\/login/);
  await existingContext.close();

  const newEmail = `new-invite-${suffix}@pozanuta.test`;
  const beforeNewInvite = await mailMessageIds(request);
  await inviteFromTeamPage(page, newEmail, "viewer");
  await expect(page.getByText(/zapisano i wysłano/i)).toBeVisible();
  const inviteUrl = await newMessageUrl(request, beforeNewInvite, /https?:\/\/[^\s"'<>]+\/auth\/confirm\?[^\s"'<>]+/);
  const newUserContext = await browser.newContext();
  const newUserPage = await newUserContext.newPage();
  await newUserPage.goto(inviteUrl);
  await expect(newUserPage.getByRole("heading", { name: "Co naprawdę działa?" })).toBeVisible();
  const { data: newAuthUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const newAuthUser = newAuthUsers.users.find((user) => user.email === newEmail);
  const { data: newProfile } = await admin.from("admin_profiles").select("role,status").eq("user_id", newAuthUser!.id).single();
  expect(newProfile).toMatchObject({ role: "viewer", status: "active" });
  await newUserContext.close();

  const revoked = await createLocalAuthUser(admin, `revoked-invite-${suffix}@pozanuta.test`);
  await page.goto("/admin/team");
  await inviteFromTeamPage(page, revoked.email, "viewer");
  const revokedContext = await browser.newContext();
  const revokedPage = await revokedContext.newPage();
  const pendingMagicLink = await requestMagicLink(revokedPage, request, revoked.email);
  const revokedRow = page.getByRole("row").filter({ hasText: revoked.email });
  await revokedRow.getByRole("button", { name: "Cofnij" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cofnij zaproszenie" }).click();
  await expect(revokedRow).toHaveCount(0);
  await revokedPage.goto(pendingMagicLink);
  await expect(revokedPage).toHaveURL(/\/admin\/login\?error=access-denied/);
  const { count: revokedMemberships } = await admin.from("admin_profiles").select("user_id", { count: "exact", head: true }).eq("user_id", revoked.id);
  expect(revokedMemberships).toBe(0);
  await revokedContext.close();
});

test("failed invitation retries and pending resends retain one invitation identity", async ({ page, request }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!adminEmail || !mailpitUrl || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires the isolated local Supabase/Auth/Mailpit stack");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const email = `retry-invite-${Date.now().toString(36)}@pozanuta.test`;
  const { data: owner } = await admin.from("admin_profiles").select("user_id").eq("role", "owner").eq("status", "active").single();
  const { data: seeded, error: seedError } = await admin.from("admin_invitations").insert({
    email, role: "viewer", invited_by: owner!.user_id, status: "failed", delivery_status: "failed", attempt_count: 1, failure_code: "seeded_failure",
  }).select("id").single();
  expect(seedError).toBeNull();

  await loginWithMagicEmail(page, request, adminEmail!);
  await page.goto("/admin/team");
  const row = page.getByRole("row").filter({ hasText: email });
  await expect(row).toContainText("Nieudane · prób: 1");
  await row.getByRole("button", { name: "Ponów wysyłkę" }).click();
  await expect(page.getByText(/zaproszenie zapisano i wysłano/i)).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: email })).toContainText("Wysłane · prób: 2");
  const { data: retried } = await admin.from("admin_invitations").select("id,status,delivery_status,attempt_count").eq("email", email);
  expect(retried).toEqual([{ id: seeded!.id, status: "pending", delivery_status: "sent", attempt_count: 2 }]);

  await page.getByRole("row").filter({ hasText: email }).getByRole("button", { name: "Wyślij link ponownie" }).click();
  await expect(page.getByText(/wysyłka tego zaproszenia już trwa/i)).toBeVisible();
  const { data: duplicate } = await admin.from("admin_invitations").select("id,attempt_count").eq("email", email).single();
  expect(duplicate).toEqual({ id: seeded!.id, attempt_count: 2 });

  const { error: ageError } = await admin.from("admin_invitations").update({ last_attempt_at: new Date(Date.now() - 180_000).toISOString() }).eq("id", seeded!.id);
  expect(ageError).toBeNull();
  await page.getByRole("row").filter({ hasText: email }).getByRole("button", { name: "Wyślij link ponownie" }).click();
  await expect(page.getByText(/zaproszenie zapisano i wysłano/i)).toBeVisible();
  const { data: resent } = await admin.from("admin_invitations").select("id,attempt_count,delivery_status").eq("email", email);
  expect(resent).toEqual([{ id: seeded!.id, attempt_count: 3, delivery_status: "sent" }]);
  const { count: attempts } = await admin.from("audit_log").select("id", { count: "exact", head: true }).eq("entity_id", seeded!.id).eq("action", "admin.invitation.delivery_begin");
  expect(attempts).toBe(2);

  const rejectedEmail = `retry-${Date.now().toString(36)}@pozanuta..test`;
  const { data: rejected, error: rejectedSeedError } = await admin.from("admin_invitations").insert({
    email: rejectedEmail, role: "viewer", invited_by: owner!.user_id, status: "failed", delivery_status: "failed", attempt_count: 1, failure_code: "seeded_failure",
  }).select("id").single();
  expect(rejectedSeedError).toBeNull();
  await page.goto("/admin/team");
  await page.getByRole("row").filter({ hasText: rejectedEmail }).getByRole("button", { name: "Ponów wysyłkę" }).click();
  await expect(page.getByText(/nie udało się wysłać zaproszenia/i)).toBeVisible();
  const { data: failedAgain } = await admin.from("admin_invitations").select("id,status,delivery_status,attempt_count").eq("email", rejectedEmail);
  expect(failedAgain).toEqual([{ id: rejected!.id, status: "failed", delivery_status: "failed", attempt_count: 2 }]);
});

test("referral attribution keeps browser-first Michał, session-two Dima, and ignores later-session Victor", async ({ browser, page, request }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!adminEmail || !supabaseUrl || !serviceKey || !mailpitUrl || testInfo.project.name !== "desktop-chromium", "Requires the isolated local Supabase/Auth/Mailpit stack");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const suffix = Date.now().toString(36);
  const participants = [
    { name: `Michał ${suffix}`, link: `Michał poleca ${suffix}` },
    { name: `Dima ${suffix}`, link: `Dima poleca ${suffix}` },
    { name: `Victor ${suffix}`, link: `Victor poleca ${suffix}` },
  ];

  await loginWithMagicEmail(page, request, adminEmail!);
  await page.goto("/admin/referrals");
  for (const participant of participants) {
    await page.getByRole("button", { name: "Dodaj uczestnika" }).click();
    await page.getByLabel("Nazwa wyświetlana").fill(participant.name);
    await page.getByRole("button", { name: "Dodaj uczestnika", exact: true }).click();
    const participantRow = page.getByRole("row").filter({ hasText: participant.name }).filter({ has: page.getByRole("button", { name: "Nowy link" }) });
    await expect(participantRow).toBeVisible();
    await participantRow.getByRole("button", { name: "Nowy link" }).click();
    await page.getByLabel("Nazwa linku").fill(participant.link);
    await page.getByRole("button", { name: "Utwórz link" }).click();
    await expect(page.getByRole("row").filter({ hasText: participant.link })).toBeVisible();
  }

  const referralRows = await Promise.all(participants.map(async (participant) => {
    const row = page.getByRole("row").filter({ hasText: participant.link });
    const path = await row.locator("code").textContent();
    expect(path).toMatch(/^\/r\/[A-HJ-NP-Z2-9]{6}$/);
    const { data, error } = await admin.from("referral_participants").select("id").eq("display_name", participant.name).single();
    expect(error).toBeNull();
    return { ...participant, id: data!.id, path: path! };
  }));

  const publicContext = await browser.newContext();
  const consentResponse = await publicContext.request.post("/api/consent", { data: { analytics: true, marketing: false } });
  expect(consentResponse.ok()).toBe(true);
  const publicPage = await publicContext.newPage();

  const firstLandingView = publicPage.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "page_view");
  await publicPage.goto(referralRows[0].path);
  await firstLandingView;
  const visitorId = decodeAnalyticsCookie((await publicContext.cookies()).find((cookie) => cookie.name === "pn_visitor")?.value);
  const firstSessionId = decodeAnalyticsCookie((await publicContext.cookies()).find((cookie) => cookie.name === "pn_session")?.value);
  expect(visitorId).toBeTruthy();
  expect(firstSessionId).toBeTruthy();
  await expect.poll(async () => (await admin.from("analytics_sessions_v2").select("session_acquisition").eq("session_id", firstSessionId).single()).data?.session_acquisition?.referralParticipantId).toBe(referralRows[0].id);

  await publicContext.clearCookies({ name: "pn_session" });
  const secondLandingView = publicPage.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "page_view");
  await publicPage.goto(referralRows[1].path);
  await secondLandingView;
  const secondSessionId = decodeAnalyticsCookie((await publicContext.cookies()).find((cookie) => cookie.name === "pn_session")?.value);
  expect(secondSessionId).not.toBe(firstSessionId);
  await expect.poll(async () => (await admin.from("analytics_sessions_v2").select("session_acquisition").eq("session_id", secondSessionId).single()).data?.session_acquisition?.referralParticipantId).toBe(referralRows[1].id);

  const laterSameSessionView = publicPage.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "page_view");
  await publicPage.goto(referralRows[2].path);
  await laterSameSessionView;
  await expect.poll(async () => (await admin.from("analytics_sessions_v2").select("session_acquisition").eq("session_id", secondSessionId).single()).data?.session_acquisition?.referralParticipantId).toBe(referralRows[1].id);
  const { data: visitor } = await admin.from("analytics_visitors").select("first_acquisition").eq("visitor_id", visitorId).single();
  expect(visitor?.first_acquisition?.referralParticipantId).toBe(referralRows[0].id);
  const { data: eligibleEvents } = await admin.from("analytics_events_v2").select("environment,traffic_class").in("session_id", [firstSessionId, secondSessionId]);
  expect(eligibleEvents?.length).toBeGreaterThan(0);
  expect(eligibleEvents?.every((event) => event.environment === "production" && event.traffic_class === "external")).toBe(true);
  await publicContext.close();

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);
  const { data: leaderboard, error: leaderboardError } = await admin.rpc("referral_leaderboard_v1", { p_from_date: today, p_to_date_exclusive: tomorrowDate });
  expect(leaderboardError).toBeNull();
  const byParticipant = new Map((leaderboard as Array<Record<string, unknown>>).map((row) => [row.participantId, row]));
  expect(byParticipant.get(referralRows[0].id)).toMatchObject({ newVisitors: 1, acquiredSessions: 1 });
  expect(byParticipant.get(referralRows[1].id)).toMatchObject({ newVisitors: 0, acquiredSessions: 1 });
  expect(byParticipant.get(referralRows[2].id)).toMatchObject({ newVisitors: 0, acquiredSessions: 0 });

  await page.reload();
  const michalLeaderboardRow = page.getByRole("row").filter({ hasText: referralRows[0].name }).first();
  const dimaLeaderboardRow = page.getByRole("row").filter({ hasText: referralRows[1].name }).first();
  const victorLeaderboardRow = page.getByRole("row").filter({ hasText: referralRows[2].name }).first();
  await expect(michalLeaderboardRow).toContainText("1");
  await expect(dimaLeaderboardRow).toContainText("1");
  await expect(victorLeaderboardRow).toContainText("0");
});

test("admin sidebar collapses, persists, identifies active routes, and behaves as a mobile sheet", async ({ page, request }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(!adminEmail || !mailpitUrl || testInfo.project.name !== "desktop-chromium", "Requires the isolated local Supabase/Auth/Mailpit stack");
  await loginWithMagicEmail(page, request, adminEmail!);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/admin/referrals");
  const desktopSidebar = page.locator('[data-slot="sidebar"][data-state]');
  await expect(desktopSidebar).toHaveAttribute("data-state", "expanded");
  await expect(page.getByRole("link", { name: "Polecenia" })).toHaveAttribute("data-active", "");
  await expect(page.getByRole("link", { name: "Polecenia" })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Control+b");
  await expect(desktopSidebar).toHaveAttribute("data-state", "collapsed");
  await page.reload();
  await expect(desktopSidebar).toHaveAttribute("data-state", "collapsed");
  await page.locator('[data-slot="sidebar-trigger"]').click();
  await expect(desktopSidebar).toHaveAttribute("data-state", "expanded");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/team");
  await expect(page.getByRole("heading", { name: "Zespół i dostęp" })).toBeVisible();
  const memberWithActions = page.getByRole("row").filter({ has: page.getByRole("button", { name: "Zmień rolę" }) }).first();
  await expect(memberWithActions.getByRole("button", { name: "Zmień rolę" })).toBeInViewport();
  expect(await memberWithActions.getByRole("button", { name: "Zmień rolę" }).evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await expect(memberWithActions.getByText("Status:")).toBeVisible();
  const mobileTrigger = page.locator('[data-slot="sidebar-trigger"]');
  await expect(mobileTrigger).toHaveAttribute("aria-expanded", "false");
  await mobileTrigger.click();
  await expect(mobileTrigger).toHaveAttribute("aria-expanded", "true");
  const mobileNavigation = page.getByRole("dialog", { name: "Nawigacja panelu" });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.getByRole("button", { name: "Zamknij" })).toBeVisible();
  await expect.poll(() => mobileNavigation.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  expect(await mobileNavigation.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgb(23, 19, 23)");
  await page.screenshot({ path: testInfo.outputPath("admin-mobile-sheet.png") });
  await mobileNavigation.getByRole("link", { name: "Kampanie" }).click();
  await expect(page).toHaveURL(/\/admin\/campaigns$/);
  await expect(mobileNavigation).toBeHidden();
  await expect(page.getByRole("heading", { name: "Kampanie", level: 1 })).toBeVisible();
  await page.goto("/admin/referrals");
  const linkWithCopy = page.getByRole("row").filter({ has: page.getByRole("button", { name: "Kopiuj" }) }).first();
  await linkWithCopy.scrollIntoViewIfNeeded();
  await expect(linkWithCopy.getByRole("button", { name: "Kopiuj" })).toBeInViewport();
  expect(await linkWithCopy.getByRole("button", { name: "Kopiuj" }).evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("clipboard blocked"); } } }));
  await linkWithCopy.getByRole("button", { name: "Kopiuj" }).click();
  await expect(linkWithCopy.getByRole("alert")).toContainText("Zaznacz adres");
  await expect(linkWithCopy.getByRole("textbox", { name: "Adres linku do ręcznego skopiowania" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 390, height: 450 });
  await page.goto("/admin/team");
  await page.getByRole("button", { name: "Zaproś osobę" }).click();
  const inviteDialog = page.getByRole("dialog", { name: "Zaproś do panelu" });
  await expect(inviteDialog).toBeVisible();
  await inviteDialog.getByRole("button", { name: "Wyślij zaproszenie" }).scrollIntoViewIfNeeded();
  await expect(inviteDialog.getByRole("button", { name: "Wyślij zaproszenie" })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("admin-short-viewport-dialog.png") });
});

test("ownership transfer is atomic in the UI and the new owner can transfer it back", async ({ browser, page, request }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!adminEmail || !mailpitUrl || !supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires the isolated local Supabase/Auth/Mailpit stack");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const successor = await createLocalAuthUser(admin, `successor-${Date.now().toString(36)}@pozanuta.test`);
  const { error: insertError } = await admin.from("admin_profiles").insert({ user_id: successor.id, email: successor.email, role: "admin", status: "active" });
  expect(insertError).toBeNull();

  await loginWithMagicEmail(page, request, adminEmail!);
  await page.goto("/admin/team");
  const successorRow = page.getByRole("row").filter({ hasText: successor.email });
  await successorRow.getByRole("button", { name: "Przekaż rolę właściciela" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Przekaż rolę" }).click();
  await expect(page).toHaveURL(/status=ownership-transferred/);
  await expect.poll(async () => (await admin.from("admin_profiles").select("role").eq("user_id", successor.id).single()).data?.role).toBe("owner");
  await expect.poll(async () => (await admin.from("admin_profiles").select("role").eq("email", adminEmail!).single()).data?.role).toBe("admin");

  const successorContext = await browser.newContext();
  const successorPage = await successorContext.newPage();
  await loginWithMagicEmail(successorPage, request, successor.email);
  await successorPage.goto("/admin/team");
  const formerOwnerRow = successorPage.getByRole("row").filter({ hasText: adminEmail! });
  await formerOwnerRow.getByRole("button", { name: "Przekaż rolę właściciela" }).click();
  await successorPage.getByRole("alertdialog").getByRole("button", { name: "Przekaż rolę" }).click();
  await expect(successorPage).toHaveURL(/status=ownership-transferred/);
  await expect.poll(async () => (await admin.from("admin_profiles").select("role").eq("email", adminEmail!).single()).data?.role).toBe("owner");
  const { data: activeOwners } = await admin.from("admin_profiles").select("user_id").eq("role", "owner").eq("status", "active");
  expect(activeOwners).toHaveLength(1);
  await successorContext.close();
});

test("local analytics preserves immediate acquisition and consent-gated returning visitor identity", async ({ browser }, testInfo) => {
  test.skip(!supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires the isolated local Supabase stack");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });

  const immediate = await browser.newContext({ javaScriptEnabled: false });
  const landing = await immediate.newPage();
  await landing.goto("/?utm_source=chatgpt&utm_medium=referral&utm_campaign=instant-race");
  const sessionCookie = (await immediate.cookies()).find((cookie) => cookie.name === "pn_session");
  expect(sessionCookie).toBeTruthy();
  const sessionId = JSON.parse(Buffer.from(sessionCookie!.value.split(".")[0].replaceAll("-", "+").replaceAll("_", "/"), "base64url").toString("utf8")).id as string;
  const redirect = await immediate.request.get("/go/instagram", { maxRedirects: 0, headers: { referer: "http://localhost:3000/" } });
  expect(redirect.status()).toBe(302);
  await expect.poll(async () => {
    const { data } = await admin.from("analytics_events_v2").select("attributed_context").eq("session_id", sessionId).eq("event_name", "outbound_click").maybeSingle();
    return data?.attributed_context as Record<string, unknown> | undefined;
  }).toMatchObject({ source: "chatgpt", medium: "referral" });
  await immediate.close();

  const consented = await browser.newContext();
  const page = await consented.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Zgadzam się na analitykę" }).click();
  const firstView = page.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "contact_view");
  await page.goto("/kontakt");
  await firstView;
  const firstVisitorCookie = (await consented.cookies()).find((cookie) => cookie.name === "pn_visitor");
  expect(firstVisitorCookie).toBeTruthy();
  const visitorId = JSON.parse(Buffer.from(firstVisitorCookie!.value.split(".")[0].replaceAll("-", "+").replaceAll("_", "/"), "base64url").toString("utf8")).id as string;
  const firstSessionCookie = (await consented.cookies()).find((cookie) => cookie.name === "pn_session")!;
  const firstSessionId = JSON.parse(Buffer.from(firstSessionCookie.value.split(".")[0].replaceAll("-", "+").replaceAll("_", "/"), "base64url").toString("utf8")).id as string;
  await consented.clearCookies({ name: "pn_session" });
  const secondView = page.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "contact_view");
  await page.goto("/kontakt");
  await secondView;
  const secondSessionCookie = (await consented.cookies()).find((cookie) => cookie.name === "pn_session")!;
  const secondSessionId = JSON.parse(Buffer.from(secondSessionCookie.value.split(".")[0].replaceAll("-", "+").replaceAll("_", "/"), "base64url").toString("utf8")).id as string;
  expect(secondSessionId).not.toBe(firstSessionId);
  const { data: visitorSessions } = await admin.from("analytics_sessions_v2").select("session_id,visitor_id").eq("visitor_id", visitorId);
  expect(new Set(visitorSessions?.map((row) => row.session_id))).toEqual(new Set([firstSessionId, secondSessionId]));
  await consented.close();
});

test("local disabled database destination is not resurrected from environment fallback", async ({ request }, testInfo) => {
  test.skip(!supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires the isolated local Supabase stack");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: destination } = await admin.from("destinations").select("id,active").eq("slug", "instagram").single();
  await admin.from("destinations").update({ active: false }).eq("id", destination!.id);
  try {
    const response = await request.get("/go/instagram", { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(new URL(response.headers().location).pathname).toBe("/");
  } finally {
    await admin.from("destinations").update({ active: destination!.active }).eq("id", destination!.id);
  }

  const suffix = Date.now().toString(36);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 6 }, (_, index) => alphabet[(Date.now() + index * 7) % alphabet.length]).join("");
  const { data: campaign, error: campaignError } = await admin.from("campaigns").insert({ name: `Archived route ${suffix}`, slug: `archived-route-${suffix}`, status: "archived" }).select("id").single();
  expect(campaignError).toBeNull();
  const { error: linkError } = await admin.from("tracking_links").insert({ code, campaign_id: campaign!.id, label: `Archived ${suffix}`, channel_group: "offline", source: "poster", medium: "qr", landing_path: "/", active: true });
  expect(linkError).toBeNull();
  const archived = await request.get(`/r/${code}`, { maxRedirects: 0 });
  expect(archived.status()).toBe(302);
  expect(new URL(archived.headers().location).pathname).toBe("/");
});

test("local contact journey emits one view and one click with preserved attribution", async ({ browser }, testInfo) => {
  test.skip(!supabaseUrl || !serviceKey || testInfo.project.name !== "desktop-chromium", "Requires the isolated local Supabase stack");
  const admin = createClient(supabaseUrl!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const context = await browser.newContext();
  const page = await context.newPage();
  const contactView = page.waitForResponse((response) => response.url().endsWith("/api/track") && response.request().postDataJSON()?.eventName === "contact_view");
  await page.goto("/kontakt?utm_source=chatgpt&utm_medium=referral&utm_campaign=contact-test");
  await contactView;
  const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === "pn_session")!;
  const sessionId = JSON.parse(Buffer.from(sessionCookie.value.split(".")[0].replaceAll("-", "+").replaceAll("_", "/"), "base64url").toString("utf8")).id as string;
  const beacon = page.waitForRequest((request) => request.url().endsWith("/api/track"));
  await page.locator('a[href^="mailto:"]').click();
  await beacon;
  await expect.poll(async () => {
    const { data } = await admin.from("analytics_events_v2").select("event_name,attributed_context").eq("session_id", sessionId).in("event_name", ["page_view", "contact_view", "contact_click"]);
    return data;
  }).toHaveLength(3);
  const { data } = await admin.from("analytics_events_v2").select("event_name,attributed_context").eq("session_id", sessionId).in("event_name", ["page_view", "contact_view", "contact_click"]);
  expect(data?.map((event) => event.event_name).sort()).toEqual(["contact_click", "contact_view", "page_view"]);
  expect(data?.every((event) => event.attributed_context?.source === "chatgpt")).toBe(true);
  await context.close();
});

async function waitForHydration(page: import("@playwright/test").Page) {
  await page.waitForLoadState("load");
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function createLocalAuthUser(admin: SupabaseClient, email: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message || `Unable to create ${email}`);
  return { id: data.user.id, email };
}

function decodeAnalyticsCookie(value?: string) {
  if (!value) return "";
  return JSON.parse(Buffer.from(value.split(".")[0], "base64url").toString("utf8")).id as string;
}

async function loginWithMagicEmail(page: import("@playwright/test").Page, request: import("@playwright/test").APIRequestContext, email: string) {
  const magicUrl = await requestMagicLink(page, request, email);
  await page.goto(magicUrl);
  await waitForHydration(page);
}

async function requestMagicLink(page: import("@playwright/test").Page, request: import("@playwright/test").APIRequestContext, email: string) {
  if (!mailpitUrl) throw new Error("Mailpit is required");
  const beforeResponse = await request.get(`${mailpitUrl}/api/v1/messages`);
  const beforeMailbox = await beforeResponse.json() as { messages?: Array<{ ID?: string }> };
  const existingIds = new Set(beforeMailbox.messages?.map((message) => message.ID).filter(Boolean));
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Wyślij magic link" }).click();
  await expect(page.getByText(/Link do logowania został wysłany/)).toBeVisible();
  let messageId: string | null = null;
  await expect.poll(async () => {
    const response = await request.get(`${mailpitUrl}/api/v1/messages`);
    const mailbox = await response.json() as { messages?: Array<{ ID?: string }> };
    messageId = mailbox.messages?.find((message) => message.ID && !existingIds.has(message.ID))?.ID || null;
    return messageId;
  }, { timeout: 10_000 }).not.toBeNull();
  const messageResponse = await request.get(`${mailpitUrl}/api/v1/message/${messageId}`);
  const message = await messageResponse.json() as { HTML?: string; Text?: string };
  const body = `${message.HTML || ""}\n${message.Text || ""}`.replaceAll("&amp;", "&");
  const magicUrl = body.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/)?.[0];
  if (!magicUrl) throw new Error(`Magic link missing for ${email}`);
  return magicUrl;
}

async function inviteFromTeamPage(page: import("@playwright/test").Page, email: string, role: "admin" | "viewer") {
  await page.getByRole("button", { name: "Zaproś osobę" }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Rola").selectOption(role);
  await page.getByRole("button", { name: "Wyślij zaproszenie" }).click();
  await page.waitForURL(/\/admin\/team\?status=/);
}

async function mailMessageIds(request: import("@playwright/test").APIRequestContext) {
  if (!mailpitUrl) throw new Error("Mailpit is required");
  const response = await request.get(`${mailpitUrl}/api/v1/messages`);
  const mailbox = await response.json() as { messages?: Array<{ ID?: string }> };
  return new Set(mailbox.messages?.map((message) => message.ID).filter((id): id is string => Boolean(id)) || []);
}

async function newMessageUrl(
  request: import("@playwright/test").APIRequestContext,
  previousIds: Set<string>,
  pattern: RegExp,
) {
  if (!mailpitUrl) throw new Error("Mailpit is required");
  let messageId: string | null = null;
  await expect.poll(async () => {
    const response = await request.get(`${mailpitUrl}/api/v1/messages`);
    const mailbox = await response.json() as { messages?: Array<{ ID?: string }> };
    messageId = mailbox.messages?.find((message) => message.ID && !previousIds.has(message.ID))?.ID || null;
    return messageId;
  }, { timeout: 10_000 }).not.toBeNull();
  const response = await request.get(`${mailpitUrl}/api/v1/message/${messageId}`);
  const message = await response.json() as { HTML?: string; Text?: string };
  const body = `${message.HTML || ""}\n${message.Text || ""}`.replaceAll("&amp;", "&");
  const url = body.match(pattern)?.[0];
  if (!url) throw new Error("Expected URL was not found in the new email");
  return url;
}
