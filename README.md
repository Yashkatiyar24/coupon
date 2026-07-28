# CouponsAndDeals — programmatic-SEO coupon site

Static Astro site, multi-category (fashion, electronics, home, beauty, health,
travel — add your own). One committed `deals.json` is the CMS; Cloudflare Pages
is the infra. No backend, no database, no accounts. The taxonomy is data-driven:
nav, homepage, category pages, and sidebars all derive from the JSON via
[`src/lib/catalog.js`](src/lib/catalog.js), so adding a category or brand needs
zero template edits. Generates 3 SEO pages per brand
(`/[brand]-coupon-code`, `/[brand]-promo-code-2026`, `/[brand]-discount`) plus a
homepage, one page per category, and `sitemap-index.xml`.

## Run

```bash
npm install
npm run build   # generates dist/ + sitemap
npm run dev     # local preview at http://localhost:4321
npm run check   # fails if any page lacks a <title> or has a broken affiliate link
```

## Data model ([`src/data/deals.json`](src/data/deals.json))

Two arrays: `categories` (the taxonomy) and `brands` (which reference a category slug).

**Add a category** — append to `categories`; that's all:

```json
{ "slug": "pets", "name": "Pet Supplies", "short": "Pets" }
```

`short` is the nav/pill label; `name` is used in headings and meta. An unknown
slug still works (title-cased automatically), but define it for a clean label.

**Add a brand** — append to `brands` with any existing category slug:

```json
{
  "brand": "New Store",
  "slug": "new-store",
  "category": "pets",
  "affiliateUrl": "https://newstore.com/?aff_id=YOUR_ID",
  "description": "One-line blurb used in intros and meta.",
  "offers": [
    { "code": "SAVE10", "title": "10% off first order", "type": "code", "expires": "2026-12-31" },
    { "code": null,     "title": "Free shipping over $40", "type": "deal", "expires": "2026-12-31" }
  ]
}
```

Rebuild — its 3 pages, nav/category links, and sitemap entries appear automatically.
Intros/titles/FAQs are generated per brand+pattern in
[`src/lib/content.js`](src/lib/content.js), so no two pages are duplicates.

## Deploy (Cloudflare Pages, free)

**First time — via dashboard:**
1. Push this repo to GitHub.
2. Cloudflare dashboard → Pages → *Create* → connect the repo.
3. Build command `npm run build`, output dir `dist`, Node 20. Deploy.
4. Set your real domain in [`astro.config.mjs`](astro.config.mjs) (`site:`) and
   in [`public/robots.txt`](public/robots.txt) — this drives canonical URLs and the sitemap.

**Automation** — [`.github/workflows/sync.yml`](.github/workflows/sync.yml):
every 6 h it runs the crawler self-test, crawls all enabled sources, commits
refreshed data, rebuilds, runs the page check, and deploys; weekly it
HEAD-checks every merchant link (a failure fails the job → GitHub emails you).
Pushes to `main` deploy immediately. Repo secrets: `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`, plus whichever network credentials you have (below).

## Crawler & affiliate engine

```
scripts/crawler/
  engine.mjs        # pipeline: fetch → validate → affiliate-rewrite → dedupe → expire → merge
  affiliate.mjs     # builds OUR tracking links (Impact/CJ/Awin/Rakuten/ShareASale/Amazon)
  engine.test.mjs   # end-to-end pipeline self-test (npm run crawl:test)
  sources/          # one module per feed — impact, cj, awin, fixture
```

- **Add a source:** drop a file in `sources/` exporting `name`, `enabled(env)`,
  `crawl(env, {fetchRetry, slugify})` returning
  `[{ name, category, homepage, offers: [{code,title,expires}] }]`. That's it —
  the engine handles everything else, including auto-adding new merchants and
  categories to the site.
- **Sources are env-gated:** without credentials a source skips cleanly, so
  `npm run crawl` is always safe. Enable by adding secrets:
  Impact `IMPACT_ACCOUNT_SID`/`IMPACT_AUTH_TOKEN`, CJ `CJ_API_TOKEN`/`CJ_WEBSITE_ID`,
  Awin `AWIN_API_TOKEN`/`AWIN_PUBLISHER_ID`.
- **Affiliate links are always yours.** [`src/data/affiliates.json`](src/data/affiliates.json)
  maps each merchant to a network + merchant-side IDs; your account IDs come from
  env (`CJ_PID`, `AWIN_AFF_ID`, `IMPACT_PARTNER_ID`, `RAKUTEN_SITE_ID`,
  `SHAREASALE_AFF_ID`, `AMAZON_TAG`). Feed tracking params are stripped; unmapped
  merchants fall back to their clean homepage — a source's affiliate link is never
  published.
- Expired offers are pruned by the crawler on every sync *and* filtered at build
  time, so they never render.

## Google Search Console

1. Add your domain as a property, verify via DNS or the Cloudflare integration.
2. Submit `https://yourdomain.com/sitemap-index.xml` (and `/rss.xml` to any feed services).
3. `robots.txt` already points crawlers to the sitemap — update the host there.

## Click tracking (`/go/<slug>`)

Every offer button links to `/go/<slug>`, handled by a Cloudflare Pages Function
([functions/go/[slug].js](functions/go/[slug].js)): it 302s to the merchant's
affiliate URL (from the build-generated `/go-map.json`) and logs the click to
Workers Analytics Engine (binding in [wrangler.toml](wrangler.toml), free tier).
View CTR per merchant in the Cloudflare dashboard → Analytics Engine →
`coupon_clicks`. `/go/` is robots-disallowed. Note: redirects need Cloudflare
Pages (or `npx wrangler pages dev dist` locally) — plain `astro preview`
doesn't run functions.

## Tag pages & admin

- **Tag pages** (`/tag/free-shipping`, `/tag/sitewide`, …) are auto-derived from
  offer titles — long-tail SEO with zero extra data. Add a pattern to `TAGS` in
  [src/lib/content.js](src/lib/content.js) to create a new one; empty tags don't build.
- **`/admin`** is a zero-backend catalog editor: edit the JSON in-browser,
  validate, download `deals.json`, commit it. Noindex, excluded from the
  sitemap, writes nothing by itself — publishing still goes through git + CI.

## What was cut (and when to add it)

- No JS framework/components — plain Astro + one `<style>`. Add only if a page needs interactivity.
- No user accounts, votes, or submissions — that's the point where a database/backend becomes worth it.
- No per-offer deal pages — 50 offers would make thin pages; revisit past ~1,000 offers with rich descriptions.
- Offer `expires` shows as "Valid till" but no countdown UI — wire up if you want urgency.
