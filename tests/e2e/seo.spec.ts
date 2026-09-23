import { expect, test } from "@playwright/test";

const publicRoutes = [
  { path: "/", heading: "POZA NUTĄ" },
  { path: "/karaoke-trojmiasto", heading: "Karaoke w Trójmieście" },
  { path: "/dla-lokali", heading: "Współpraca z lokalami" },
  { path: "/kontakt", heading: "Kontakt / współpraca" },
  { path: "/privacy", heading: "Prywatność bez kombinowania." },
];
const canonicalOrigin = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

for (const { path, heading } of publicRoutes) {
  test(`${path} has crawlable route-specific metadata and truthful JSON-LD`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: heading, exact: true, level: 1 })).toBeVisible();
    const canonical = `${canonicalOrigin}${path === "/" ? "" : path}`;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Poza Nutą|mierzy ruch/);
    const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() || "{}");
    expect(graph["@graph"].some((node: { [key: string]: unknown }) => node["@type"] === "WebPage" && node.url === canonical)).toBe(true);
    expect(graph["@graph"].some((node: { [key: string]: unknown }) => ["LocalBusiness", "Event"].includes(String(node["@type"])))).toBe(false);
    if (path === "/") {
      const organization = graph["@graph"].find((node: { [key: string]: unknown }) => node["@type"] === "Organization");
      expect(organization?.name).toBe("Poza Nutą");
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
  await page.goto("/karaoke-trojmiasto");
  await expect(page.getByRole("heading", { name: "Karaoke w Trójmieście" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Współpraca z lokalami" })).toHaveAttribute("href", "/dla-lokali");
  await page.goto("/dla-lokali");
  await expect(page.getByRole("heading", { name: "Współpraca z lokalami" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kontakt / współpraca" })).toHaveAttribute("href", "/kontakt");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await context.close();
});

test("new routes keep existing page-view tracking flow", async ({ page }) => {
  const view = page.waitForRequest((request) => request.url().endsWith("/api/track") && request.postDataJSON()?.eventName === "page_view" && request.postDataJSON()?.path === "/dla-lokali");
  await page.goto("/dla-lokali");
  const request = await view;
  expect((await request.response())?.status()).toBe(204);
});

test("robots, sitemap, redirects and noindex boundaries follow the public surface", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("User-Agent: OAI-SearchBot");
  expect(robots).toContain("User-Agent: GPTBot");
  expect(robots).toContain("Disallow: /");
  for (const path of ["/admin", "/api", "/r/", "/go/", "/auth"]) expect(robots).toContain(`Disallow: ${path}`);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locations).toEqual(publicRoutes.map(({ path }) => `${canonicalOrigin}${path === "/" ? "" : path}`));
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
