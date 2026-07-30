// Affiliate Link Engine — every outgoing URL is rebuilt with OUR tracking IDs.
// Source-feed tracking links are never used. Mapping lives in
// src/data/affiliates.json (per-merchant network + merchant-side IDs);
// OUR account IDs come from env so they never live in the repo.
//
// Env (set in GitHub Actions secrets):
//   IMPACT_PARTNER_ID, CJ_PID, AWIN_AFF_ID, RAKUTEN_SITE_ID,
//   SHAREASALE_AFF_ID, AMAZON_TAG
import { readFile } from 'node:fs/promises';

const MAP_PATH = new URL('../../src/data/affiliates.json', import.meta.url);

// Real deeplink formats per network. m = merchant entry from affiliates.json.
const NETWORKS = {
  impact: (m, url, env) =>
    m.subdomain && env.IMPACT_PARTNER_ID
      ? `https://${m.subdomain}.sjv.io/c/${env.IMPACT_PARTNER_ID}/${m.programId}/${m.adId ?? m.programId}?u=${encodeURIComponent(url)}`
      : null,
  cj: (m, url, env) =>
    m.aid && env.CJ_PID
      ? `https://www.anrdoezrs.net/click-${env.CJ_PID}-${m.aid}?url=${encodeURIComponent(url)}`
      : null,
  awin: (m, url, env) =>
    m.mid && env.AWIN_AFF_ID
      ? `https://www.awin1.com/cread.php?awinmid=${m.mid}&awinaffid=${env.AWIN_AFF_ID}&ued=${encodeURIComponent(url)}`
      : null,
  rakuten: (m, url, env) =>
    m.mid && env.RAKUTEN_SITE_ID
      ? `https://click.linksynergy.com/deeplink?id=${env.RAKUTEN_SITE_ID}&mid=${m.mid}&murl=${encodeURIComponent(url)}`
      : null,
  shareasale: (m, url, env) =>
    m.mid && env.SHAREASALE_AFF_ID
      ? `https://www.shareasale.com/r.cfm?u=${env.SHAREASALE_AFF_ID}&m=${m.mid}&urllink=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}`
      : null,
  amazon: (m, url, env) => {
    if (!env.AMAZON_TAG) return null;
    const u = new URL(url);
    u.searchParams.set('tag', env.AMAZON_TAG);
    return u.href;
  },
};

let mapCache;
export async function affiliateMap() {
  if (!mapCache) mapCache = JSON.parse(await readFile(MAP_PATH, 'utf8'));
  return mapCache;
}

// Build OUR affiliate URL for a merchant. `aff` is an optional mapping supplied
// by the source feed itself (e.g. CJ's advertiser-id) used when the merchant
// has no affiliates.json entry — the tracked URL is still built from OUR env
// IDs, never taken from the feed. Falls back to the merchant's clean homepage.
export async function buildAffiliateUrl(slug, homepage, env = process.env, aff = null) {
  const map = await affiliateMap();
  const m = map[slug] ?? aff;
  const clean = stripTracking(homepage);
  if (!m || !NETWORKS[m.network]) return clean;
  return NETWORKS[m.network](m, m.deeplink || clean, env) ?? clean;
}

// Remove any tracking params a source feed may have attached.
export function stripTracking(url) {
  try {
    const u = new URL(url);
    const drop = /^(utm_|aff|ref|irclickid|clickid|cjevent|awc|tag$)/i;
    [...u.searchParams.keys()].filter((k) => drop.test(k)).forEach((k) => u.searchParams.delete(k));
    return u.href;
  } catch {
    return url;
  }
}
