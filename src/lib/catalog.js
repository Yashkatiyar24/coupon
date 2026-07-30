// Single source of truth derived from deals.json. Everything (nav, homepage,
// category pages, sidebars) reads from here, so adding a category or brand to
// the JSON — or having the feed do it — flows through the whole site with no
// template changes.
import data from '../data/deals.json';

const titleCase = (s) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const defs = new Map((data.categories || []).map((c) => [c.slug, c]));

// Build-time expiry guard: even if a build runs between crawls, expired offers
// never render. (The crawler also prunes them from deals.json on every sync.)
const today = new Date().toISOString().slice(0, 10);
export const brands = data.brands.map((b) => ({
  ...b,
  offers: b.offers.filter((o) => !o.expires || o.expires >= today),
}));
export const initial = (b) => b.brand.replace(/^The /, '').charAt(0);

// Merchant logo via Google's favicon service (free, no auth). Pages render the
// monogram circle as fallback when a logo 404s, so a miss never shows broken.
export const logoUrl = (b) =>
  b.domain ? `https://www.google.com/s2/favicons?domain=${b.domain}&sz=128` : null;

export function catIcon(slug) { return defs.get(slug)?.icon || '🏷️'; }

// Category-themed deal photo (free, no auth, deterministic per merchant so the
// same store always shows the same image). Pages lazy-load these and hide on
// error, so a miss never breaks a card.
const CAT_KEYWORD = {
  fashion: 'fashion,clothing', electronics: 'technology,gadgets',
  'home-kitchen': 'kitchen,interior', beauty: 'cosmetics,skincare',
  health: 'vitamins,fitness', travel: 'travel,landmark',
  software: 'laptop,software', sustainable: 'nature,plants', delivery: 'food,groceries',
};
export function dealImage(brand, w = 640, h = 360) {
  let n = 0;
  for (const c of brand.slug) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  const kw = CAT_KEYWORD[brand.category] || 'shopping,retail';
  return `https://loremflickr.com/${w}/${h}/${kw}?lock=${n % 1000}`;
}
export const catBrands = (slug) => brands.filter((b) => b.category === slug);

export function catName(slug) { return defs.get(slug)?.name || titleCase(slug); }
export function catShort(slug) { return defs.get(slug)?.short || catName(slug); }

// Categories actually present in the data, defined-order first, then any extras.
export const categories = (() => {
  const present = [...new Set(brands.map((b) => b.category))];
  const ordered = (data.categories || []).map((c) => c.slug).filter((s) => present.includes(s));
  const all = [...ordered, ...present.filter((s) => !ordered.includes(s))];
  return all.map((slug) => ({ slug, name: catName(slug), short: catShort(slug), icon: catIcon(slug), count: catBrands(slug).length }));
})();

export const totalOffers = brands.reduce((n, b) => n + b.offers.length, 0);
