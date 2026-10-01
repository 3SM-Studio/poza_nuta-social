import { expect, test } from "@playwright/test";
import { confirmAnalyticsConsent } from "./helpers/confirmed-analytics-consent";

const publicRoutes = [
  { path: "/", heading: "Zanim ktoś chwyci mikrofon." },
  { path: "/karaoke", heading: "Karaoke w Trójmieście." },
  { path: "/dla-lokali", heading: "Twój lokal. Wspólny wieczór." },
  { path: "/kontakt", heading: "Napisz do nas." },
  { path: "/linki", heading: "Oficjalne kanały." },
  { path: "/prywatnosc", heading: "Prywatność" },
  { path: "/cookies", heading: "Cookies na tej stronie" },
];
const canonicalOrigin = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const preview = process.env.VERCEL_ENV === "preview";

for (const { path, heading } of publicRoutes) {
  test(`${path} has route-specific metadata and truthful JSON-LD`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: heading, exact: true, level: 1 })).toBeVisible();
    const canonical = `${canonicalOrigin}${path === "/" ? "" : path}`;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${canonicalOrigin}/opengraph-image`);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", `${canonicalOrigin}/opengraph-image`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Poza Nutą|mierzy ruch/);
    if (path === "/linki") await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex, follow/);
    else if (preview) await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex, nofollow/);
    else await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() || "{}");
    expect(graph["@graph"].some((node: { [key: string]: unknown }) => node["@type"] === "WebPage" && node.url === canonical)).toBe(true);
    expect(graph["@graph"].some((node: { [key: string]: unknown }) => ["LocalBusiness", "Event"].includes(String(node["@type"])))).toBe(false);
    if (path === "/") {
      const organization = graph["@graph"].find((node: { [key: string]: unknown }) => node["@type"] === "Organization");
      expect(organization?.name).toBe("Poza Nutą");
      expect(organization?.logo).toBe(`${canonicalOrigin}/brand/poza-nuta-logo.svg`);
      expect(organization?.email).toBe("hello@pozanuta.pl");
      for (const profile of organization?.sameAs || []) {
        const url = new URL(profile);
        expect(url.protocol).toBe("https:");
        expect(url.hostname).toMatch(/(^|\.)(instagram\.com|tiktok\.com|facebook\.com|fb\.com|youtube\.com|youtu\.be)$/);
      }
    } else {
      expect(graph["@graph"].some((node: { [key: string]: unknown }) => node["@type"] === "BreadcrumbList")).toBe(true);
      await expect(page.getByRole("navigation", { name: "Ścieżka" })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

test("new routes remain readable without JavaScript and expose internal links", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.goto("/karaoke");
  await expect(page.getByRole("heading", { name: "Karaoke w Trójmieście." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Informacje dla lokali" })).toHaveAttribute("href", "/dla-lokali");
  await page.goto("/dla-lokali");
  await expect(page.getByRole("heading", { name: "Twój lokal. Wspólny wieczór." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Porozmawiajmy o współpracy" })).toHaveAttribute("href", "/kontakt");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await context.close();
});

test("new routes keep consented page-view tracking flow", async ({ page }) => {
  await page.goto("/");
  await confirmAnalyticsConsent(page, page.getByRole("button", { name: "Zgadzam się na analitykę" }));
  const view = page.waitForRequest((request) => request.url().endsWith("/api/track") && request.postDataJSON()?.eventName === "page_view" && request.postDataJSON()?.path === "/dla-lokali");
  await page.goto("/dla-lokali");
  const request = await view;
  expect((await request.response())?.status()).toBe(204);
});

test("public browser requests remain first-party after confirmed analytics consent", async ({ page }) => {
  test.skip(!process.env.LOCAL_ADMIN_E2E_EMAIL, "requires connected local Supabase");
  const externalHosts = new Set<string>();
  page.on("request", (request) => {
    if (!request.url().startsWith("http")) return;
    const host = new URL(request.url()).host;
    if (host !== new URL(canonicalOrigin).host) externalHosts.add(host);
  });
  for (const { path } of publicRoutes) await page.goto(path);
  await page.goto("/");
  await confirmAnalyticsConsent(page, page.getByRole("button", { name: "Zgadzam się na analitykę" }));
  for (const { path } of publicRoutes) await page.goto(path);
  expect([...externalHosts]).toEqual([]);
});

test("robots, sitemap, redirects and noindex boundaries follow the public surface", async ({ request }) => {
  if (preview) {
    for (const path of ["/", "/linki"]) {
      const response = await request.get(path);
      expect(response.headers()["x-robots-tag"], path).toContain("noindex, nofollow, noarchive");
    }
  }
  const robots = await (await request.get("/robots.txt")).text();
  if (preview) {
    expect(robots).toContain("Allow: /");
    expect(robots).not.toContain("Sitemap:");
  } else {
    expect(robots).toContain("User-Agent: OAI-SearchBot");
    expect(robots).toContain("User-Agent: GPTBot");
    expect(robots).toContain("Disallow: /");
    for (const path of ["/admin", "/api", "/r/", "/go/", "/auth"]) expect(robots).toContain(`Disallow: ${path}`);
  }

  const sitemap = await (await request.get("/sitemap.xml")).text();
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locations).toEqual(preview ? [] : publicRoutes.filter(({ path }) => path !== "/linki").map(({ path }) => `${canonicalOrigin}${path === "/" ? "" : path}`));
  if (!preview) expect(locations).toContain(`${canonicalOrigin}/prywatnosc`);
  expect(locations).not.toContain(`${canonicalOrigin}/privacy`);
  expect(sitemap).not.toMatch(/<lastmod>|<priority>|<changefreq>/);

  for (const path of ["/admin/login", "/api/track", "/auth/callback", "/go/nonexistent", "/r/ZZZZZ"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.headers()["x-robots-tag"], path).toContain("noindex");
    if (path.startsWith("/go/") || path.startsWith("/r/")) {
      expect(response.status()).toBe(302);
      expect(new URL(response.headers().location).pathname).toBe("/");
    }
  }
  const duplicate = await request.get("/dla-lokali/", { maxRedirects: 0 });
  expect([307, 308]).toContain(duplicate.status());
  expect(new URL(duplicate.headers().location, canonicalOrigin).pathname).toBe("/dla-lokali");
  const missing = await request.get("/nie-ma-takiej-strony");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('name="robots" content="noindex"');
});

test("legacy privacy URL permanently redirects to the canonical Polish page", async ({ request }) => {
  const response = await request.get("/privacy", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(new URL(response.headers().location, canonicalOrigin).pathname).toBe("/prywatnosc");
});

test("legal pages keep semantic reading structure and direct privacy links", async ({ page }, testInfo) => {
  for (const route of ["/prywatnosc", "/cookies"]) {
    await page.goto(route);
    const article = page.locator("main article.typeset.typeset-legal");
    await expect(article).toBeVisible();
    await expect(article.locator("h1")).toHaveCount(1);
    await expect(article.locator("h2").first()).toBeVisible();
    await expect(article.locator("p").first()).toBeVisible();
    await expect(article.locator("a").first()).toBeVisible();
    await expect(page.locator("footer").getByRole("link", { name: "Prywatność" })).toHaveAttribute("href", "/prywatnosc");
    await expect(page.getByRole("navigation", { name: "Ścieżka" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${route.slice(1)}.png`), fullPage: true });
  }
  await expect(page.locator("main article h3").first()).toBeVisible();
  await expect(page.locator("main article h4").first()).toBeVisible();
  await expect(page.locator("main article a[href='/prywatnosc']")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Wybór analityki" }).getByRole("link", { name: "O prywatności" })).toHaveAttribute("href", "/prywatnosc");
});
