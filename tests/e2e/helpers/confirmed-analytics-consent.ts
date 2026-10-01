import { expect, type Locator, type Page } from "@playwright/test";

// A click records local intent immediately. Full analytics is ready only after
// the server confirms it and the browser clears the pending preference.
export async function confirmAnalyticsConsent(page: Page, trigger: Locator) {
  const confirmed = page.waitForResponse((response) =>
    response.url().endsWith("/api/consent") && response.request().method() === "POST"
      && response.request().postDataJSON()?.analytics === true,
  );
  await trigger.click();
  const response = await confirmed;
  expect(response.status(), "consent POST must be server-confirmed").toBe(200);
  await expect.poll(async () => {
    const cookies = await page.context().cookies();
    return {
      consent: cookies.some((cookie) => cookie.name === "pn_consent" && !!cookie.value),
      visitor: cookies.some((cookie) => cookie.name === "pn_visitor" && !!cookie.value),
      session: cookies.some((cookie) => cookie.name === "pn_session" && !!cookie.value),
      pending: cookies.some((cookie) => cookie.name === "pn_consent_preference"),
    };
  }, { message: "confirmed consent has signed identity cookies and no pending preference" })
    .toEqual({ consent: true, visitor: true, session: true, pending: false });
}
