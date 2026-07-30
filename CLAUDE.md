# CLAUDE.md — CouponAndDeals

Static programmatic-SEO coupon site (Astro 5, plain CSS, no JS framework) deployed
on Cloudflare Pages. Live domain: **https://www.couponanddeals.com** (no "s" —
brand is CouponAndDeals). GitHub: Yashkatiyar24/coupon. Full architecture docs
live in `README.md` — read it before structural changes; don't duplicate it here.

## Commands

- `npm run dev` — local preview (port 4321; `/go/` redirects need `npx wrangler pages dev dist` instead)
- `npm run build` — generate `dist/` + sitemap
- `npm run check` — page audit: every page needs `<title>`, no broken affiliate links (search-engine verification files in `public/` are exempt)
- `npm run crawl` / `crawl:test` — affiliate-feed crawler / its self-test
- `npm run audit` — HEAD-check merchant links

## Key facts (the non-obvious ones)

- **`src/data/deals.json` is the CMS.** 6 categories, 36 brands, ~50 offers.
  Taxonomy is data-driven via `src/lib/catalog.js` — adding categories/brands
  needs zero template edits.
- **CI is the publisher**: `.github/workflows/sync.yml` crawls every 6h, commits
  refreshed data ("chore: crawler sync" commits), rebuilds, checks, deploys.
  Pushes to `main` deploy immediately.
- **Affiliate rewriting**: `scripts/crawler/affiliate.mjs` + `src/data/affiliates.json`
  guarantee published links carry OUR network IDs (env: `CJ_PID`, `AWIN_AFF_ID`,
  `IMPACT_PARTNER_ID`, `RAKUTEN_SITE_ID`, `SHAREASALE_AFF_ID`, `AMAZON_TAG`).
  Feed tracking params are stripped; unmapped merchants get clean homepage links.
- **Click tracking**: buttons → `/go/<slug>` → Pages Function
  `functions/go/[slug].js` → 302 + Workers Analytics Engine (`coupon_clicks`).
- **Peel-button behavior** (deliberate, commit 10133f5): first click reveals +
  copies the code with NO redirect; second click opens the store.
- **CJ crawler rule** (commit 9be6974): only *joined* CJ advertisers are crawled;
  auto-added merchants get tracked links.
- **Generated pages per brand**: `/[brand]-coupon-code`, `/[brand]-promo-code-2026`,
  `/[brand]-discount`. Plus category pages, tag pages (auto-derived from offer
  titles via `TAGS` in `src/lib/content.js`), and `/admin` (noindex, zero-backend
  JSON editor).

## Sensitive / careful files

- `src/data/affiliates.json` — merchant→network mapping; wrong edits break monetization.
- `public/google*.html` — Search Console verification; never add `<title>` or delete.
- `AFFILIATE-APPLICATIONS.md` — network signup pack with reusable application answers.
- `astro.config.mjs` `site:` + `public/robots.txt` host drive canonicals/sitemap.

## Conventions

- No comments/abstractions beyond need; plain Astro + one `<style>` per page.
- Content (intros/titles/FAQs) is generated per brand+pattern in `src/lib/content.js`
  to avoid duplicate pages — extend the generators, don't hardcode page copy.
- Expired offers are pruned at crawl AND filtered at build; never render them.
