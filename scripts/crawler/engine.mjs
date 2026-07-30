// Crawler engine. Each source module in ./sources exports:
//   name                      - display name
//   enabled(env)              - true when its credentials/config are present
//   crawl(env, helpers)       - returns [{ name, slug?, category, categoryName?,
//                               homepage, description?, offers: [{code,title,expires}] }]
// The engine runs every enabled source, then: validate → rewrite affiliate
// links (OURS only) → dedupe offers → drop expired → merge into deals.json
// (updates existing merchants, auto-adds new merchants AND categories).
// A failing source logs and is skipped — one bad feed never kills the run.
//
//   node scripts/crawler/engine.mjs            # run all enabled sources
//   node scripts/crawler/engine.mjs --dry      # report, don't write
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { buildAffiliateUrl } from './affiliate.mjs';

const DEALS_PATH = new URL('../../src/data/deals.json', import.meta.url);
const SOURCES_DIR = new URL('./sources/', import.meta.url);
const DRY = process.argv.includes('--dry');

export const slugify = (s) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// fetch with retry/backoff — shared by sources
export async function fetchRetry(url, opts = {}, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      if (i === tries) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}

const today = () => new Date().toISOString().slice(0, 10);

function validMerchant(m, log) {
  const bad = (why) => (log.push(`  skip [${m?.name ?? '?'}]: ${why}`), false);
  if (!m?.name?.trim()) return bad('missing name');
  if (!m.category?.trim()) return bad('missing category');
  try {
    const u = new URL(m.homepage);
    if (u.protocol !== 'https:') return bad('homepage not https');
  } catch {
    return bad('bad homepage URL');
  }
  if (!Array.isArray(m.offers)) return bad('offers not an array');
  return true;
}

function cleanOffers(offers, log, who) {
  const seen = new Set();
  const t = today();
  return offers
    .filter((o) => {
      if (!o?.title?.trim()) return log.push(`  drop offer [${who}]: no title`), false;
      if (o.expires && o.expires < t) return log.push(`  drop offer [${who}]: expired ${o.expires}`), false;
      const key = `${(o.code || '').toUpperCase()}|${o.title.toLowerCase()}`;
      if (seen.has(key)) return log.push(`  drop offer [${who}]: duplicate`), false;
      seen.add(key);
      return true;
    })
    .map((o) => ({ code: o.code || null, title: o.title.trim(), type: o.code ? 'code' : 'deal', expires: o.expires || null }));
}

export async function run(env = process.env) {
  const log = [];
  const files = (await readdir(SOURCES_DIR)).filter((f) => f.endsWith('.mjs'));
  const crawled = [];

  for (const f of files) {
    const src = await import(new URL(f, SOURCES_DIR));
    if (!src.enabled(env)) { log.push(`source ${src.name}: disabled (no credentials)`); continue; }
    try {
      const merchants = await src.crawl(env, { fetchRetry, slugify });
      log.push(`source ${src.name}: ${merchants.length} merchant(s)`);
      crawled.push(...merchants);
    } catch (e) {
      log.push(`source ${src.name}: FAILED — ${e.message}`); // skip, don't kill the run
    }
  }

  const data = JSON.parse(await readFile(DEALS_PATH, 'utf8'));
  const bySlug = new Map(data.brands.map((b) => [b.slug, b]));
  const catSlugs = new Set(data.categories.map((c) => c.slug));
  let updated = 0, added = 0;

  for (const m of crawled) {
    if (!validMerchant(m, log)) continue;
    const slug = m.slug || slugify(m.name);
    const category = slugify(m.category);
    const offers = cleanOffers(m.offers, log, slug);
    const affiliateUrl = await buildAffiliateUrl(slug, m.homepage, env, m.aff);

    if (!catSlugs.has(category)) { // auto-add unknown category to the taxonomy
      const name = m.categoryName || m.category;
      data.categories.push({ slug: category, name, short: name.split(/ [&,]| and /)[0] });
      catSlugs.add(category);
      log.push(`+ category ${category}`);
    }

    const domain = new URL(m.homepage).hostname.replace(/^(www|shop)\./, '');
    const existing = bySlug.get(slug);
    if (existing) {
      if (offers.length) existing.offers = offers; // empty feed result keeps last-known offers
      existing.affiliateUrl = affiliateUrl;
      existing.domain = domain;
      if (m.description) existing.description = m.description;
      updated++;
    } else {
      data.brands.push({ brand: m.name, slug, category, domain, affiliateUrl, description: m.description || `Deals and coupon codes for ${m.name}.`, offers });
      bySlug.set(slug, data.brands.at(-1));
      added++;
    }
  }

  // prune expired offers on existing merchants too (daily hygiene, feed or not)
  const t = today();
  for (const b of data.brands) {
    const before = b.offers.length;
    b.offers = b.offers.filter((o) => !o.expires || o.expires >= t);
    if (b.offers.length < before) log.push(`pruned ${before - b.offers.length} expired offer(s) from ${b.slug}`);
  }

  if (!DRY) await writeFile(DEALS_PATH, JSON.stringify(data, null, 2) + '\n');
  log.push(`done: ${updated} updated, ${added} added${DRY ? ' (dry run, not written)' : ''}`);
  return { log, updated, added, data };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { log } = await run();
  console.log(log.join('\n'));
}
