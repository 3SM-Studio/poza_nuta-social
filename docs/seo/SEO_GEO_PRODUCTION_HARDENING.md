# SEO & GEO Production Hardening

Status: code and local verification only. No production deployment, ownership verification, or IndexNow submission belongs to this slice.

## Public information architecture

| Route | Visitor intent | Published facts |
| --- | --- | --- |
| `/` | Find Poza Nutą and its official channels | Brand, Trójmiasto, karaoke and music events, active official destinations, contact |
| `/karaoke-trojmiasto` | Understand Poza Nutą karaoke and where to find current information | Karaoke in Trójmiasto; current announcements live on official channels; venue collaboration path |
| `/dla-lokali` | Ask about karaoke or music-event collaboration in a venue | Collaboration with venues in Trójmiasto; information useful in an initial message; first-party contact path |
| `/kontakt` | Contact the team | Configured business email when available, otherwise a link back to official channels |
| `/privacy` | Understand tracking and consent | Existing privacy explanation and consent controls |

`/o-nas` would duplicate the home business card without new verified facts. `/wydarzenia` and individual event pages remain absent until an authoritative, maintained source provides real upcoming dates and places. There are no city-keyword doorway pages.

The pages use one organization identity: Poza Nutą organizes karaoke and music events in Trójmiasto and collaborates with venues. No address, owned venue, ratings, partner list, historical statistics, event dates, or slogan is inferred.

## Technical model

`NEXT_PUBLIC_SITE_URL` supplies the canonical origin, Open Graph URLs, structured-data IDs, sitemap URLs and robots sitemap location. The same code supports either candidate domain. A production value must be the approved HTTPS origin. Preview deployments carry `noindex` metadata; do not treat preview or localhost canonicals as production signals. Hosting redirects from any alternate production hostname to the chosen canonical host require a separate domain decision and deployment configuration.

Each indexable route has a self-referencing canonical, route-specific title, description, Open Graph URL/title/description and server-rendered HTML. The sitemap lists only the five public routes and omits fabricated update dates, `priority` and `changefreq`. Internal links connect the home hub, karaoke, venue and contact intents. Existing 404 behavior remains a real not-found response; `/r/[code]` and `/go/[slug]` remain best-effort tracked redirects with `noindex` headers. Admin, auth and API surfaces have `X-Robots-Tag: noindex, nofollow, noarchive`; admin screens also have metadata `noindex`. They are excluded from the sitemap and robots crawling rules.

JSON-LD uses `Organization` and `WebSite` on the home page, `WebPage` for public pages, and visible `BreadcrumbList` on deeper pages. `sameAs` contains only active HTTPS URLs validated against the allowlisted official social domains. No `LocalBusiness`, `Event`, reviews, ratings, or FAQ rich-result markup is emitted.

The existing analytics model remains frozen. New routes still emit the existing `page_view` event; the ingestion allowlist normalizes their paths to `/` until a separately approved Analytics change extends the database path contract. This does not alter consent, acquisition, redirects, or session identity.

## Crawler policy and source basis

- [Google Search Central: AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) favors useful people-first content and ordinary search fundamentals. It states that Google does not use `llms.txt` as a special search signal. We do not add one.
- [Google Search Central: canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) treats redirects, canonical links and sitemap inclusion as canonicalization signals. The production hostname redirect remains pending the domain choice.
- [Google Search Central: sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) calls for absolute canonical URLs and meaningful `lastmod` values only. This static sitemap omits dates because content updates are not currently tracked as reliable publish timestamps.
- [Google Search Central: Organization markup](https://developers.google.com/search/docs/appearance/structured-data/organization) supports truthful organization identity on the home or about page. Only confirmed properties are included.
- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots) distinguishes `OAI-SearchBot` for ChatGPT Search from `GPTBot` for model training. Public content remains crawlable by `OAI-SearchBot`; the existing `GPTBot` disallow policy stays in place.
- [Bing Webmaster AI Performance](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview) reports citations in supported AI experiences after Bing has data. No citation or ranking result is promised by this slice.

## Production Readiness path

1. Decide the canonical hostname (`social.pozanuta.pl` or `socials.pozanuta.pl`) and configure HTTPS, redirects for the alternate host, and `NEXT_PUBLIC_SITE_URL` consistently. Confirm canonical/OG/JSON-LD/sitemap on live responses.
2. Confirm that contact email and each active destination are approved official values. Revalidate `sameAs` against the live home page.
3. [Verify Search Console ownership](https://support.google.com/webmasters/answer/9008080?hl=en) for the selected property, then [submit the sitemap](https://support.google.com/webmasters/answer/7451001?hl=en) and inspect URL indexing/canonical reports. This is an external action outside this slice.
4. [Add and verify the site in Bing Webmaster Tools](https://www2.bing.com/webmasters/help/add-and-verify-site-12184f8b), submit or import the sitemap, and inspect crawl/indexing data. Review AI Performance when available.
5. Reassess IndexNow only when a maintained source makes meaningful content changes frequent enough to justify notifications. [IndexNow requires a host-owned key file](https://www.indexnow.org/documentation) and changed production URLs. Generate the key, host it on the approved production domain, and submit only actual changed URLs after separate authorization. No key or notification is generated in this slice.

## Local verification record

- Node 24.19.0: `npm run verify` passed with guards, Impeccable detector, lint, typecheck, 96 unit tests and a production build.
- Public Playwright E2E passed 76/76 across 360/390 px Chromium and desktop Chromium/WebKit; focused SEO checks passed again after the final route/robots changes.
- A separate preview build with `NEXT_PUBLIC_SITE_URL=https://socials.pozanuta.pl` emitted `noindex, nofollow` on `/dla-lokali` and canonical/OG/sitemap URLs on that configured host. This was a local simulation, not a deployment or domain decision.
- Final Impeccable visual review of both new routes at 360 and 1440 px returned PASS. Horizontal overflow was 0 and the footer privacy link measured 44 px high.
