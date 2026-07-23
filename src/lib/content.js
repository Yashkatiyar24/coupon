// Deterministic, varied page copy so each of the 3 URL patterns per brand
// reads differently (avoids thin/duplicate-content penalties). No randomness:
// same brand+pattern always renders the same text, so builds are reproducible.
import { catName } from './catalog.js';

// readable category phrase for prose, from the taxonomy (e.g. "home & kitchen")
const cat = (brand) => catName(brand.category).toLowerCase();

export const PATTERNS = [
  { key: 'coupon-code', suffix: 'coupon-code', label: 'Coupon Codes' },
  { key: 'promo-code-2026', suffix: 'promo-code-2026', label: 'Promo Codes 2026' },
  { key: 'discount', suffix: 'discount', label: 'Discounts & Deals' },
];

// tiny stable hash → pick an index, so copy varies by brand but is deterministic
function pick(arr, seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

export function pageUrl(brand, pattern) {
  return `/${brand.slug}-${pattern.suffix}`;
}

export function title(brand, pattern) {
  const map = {
    'coupon-code': `${brand.brand} Coupon Codes & Promo Codes (July 2026)`,
    'promo-code-2026': `${brand.brand} Promo Code 2026 — Verified Discounts`,
    'discount': `${brand.brand} Discounts & Deals — Save Today`,
  };
  return map[pattern.key];
}

export function metaDescription(brand, pattern) {
  const active = brand.offers.length;
  const map = {
    'coupon-code': `Browse ${active} ${brand.brand} coupon codes for July 2026. Stack promo codes and free-shipping deals on ${cat(brand)} before you check out.`,
    'promo-code-2026': `Latest ${brand.brand} promo codes for 2026. Get verified discounts on ${cat(brand)} — updated regularly so you never pay full price.`,
    'discount': `Save on ${brand.brand} with today's ${active} discounts and deals. Current offers on ${cat(brand)}, updated for July 2026.`,
  };
  return map[pattern.key];
}

export function h1(brand, pattern) {
  const map = {
    'coupon-code': `${brand.brand} Coupon Codes`,
    'promo-code-2026': `${brand.brand} Promo Codes for 2026`,
    'discount': `${brand.brand} Discounts & Deals`,
  };
  return map[pattern.key];
}

// Varied intro: openers vary by brand (hash), framing varies by pattern.
export function intro(brand, pattern) {
  const opener = pick([
    `Looking to spend less on ${brand.brand}?`,
    `Hunting for a deal on ${brand.brand}?`,
    `Want ${brand.brand} for less?`,
    `Shopping ${brand.brand} this week?`,
    `Ready to save at ${brand.brand}?`,
  ], brand.slug);

  const middle = `${brand.description} We track the current ${cat(brand)} offers so you can grab a discount in seconds.`;

  const framing = {
    'coupon-code': `Below are the ${brand.brand} coupon codes we're seeing right now — copy one, paste it at checkout, and the savings apply instantly.`,
    'promo-code-2026': `Here are the ${brand.brand} promo codes worth using in 2026. We refresh this list so expired codes don't waste your time.`,
    'discount': `These are the live ${brand.brand} discounts and site-wide deals — no code needed for some, so it pays to check both.`,
  }[pattern.key];

  return `${opener} ${middle} ${framing}`;
}

export function faqs(brand, pattern) {
  const has = brand.offers.some((o) => o.code);
  return [
    {
      q: `How do I use a ${brand.brand} promo code?`,
      a: `Copy the code from the list above, click through to ${brand.brand}, add your items to the cart, and paste the code in the promo/coupon field at checkout. The discount applies before you pay.`,
    },
    {
      q: `Does ${brand.brand} have a coupon code right now?`,
      a: has
        ? `Yes — there ${brand.offers.length === 1 ? 'is' : 'are'} ${brand.offers.length} active ${brand.brand} offer${brand.offers.length === 1 ? '' : 's'} listed above for July 2026, including code and deal savings.`
        : `Right now ${brand.brand} is running deals that don't need a code (like free shipping). Check the offers above — they apply automatically.`,
    },
    {
      q: `How often are ${brand.brand} deals updated?`,
      a: `We refresh offers from our affiliate feed regularly, so expired ${brand.brand} codes get pulled and new ${cat(brand)} deals get added as they go live.`,
    },
    {
      q: `Is there free shipping at ${brand.brand}?`,
      a: brand.offers.some((o) => /shipping/i.test(o.title))
        ? `Yes — ${brand.brand} currently offers free shipping on qualifying orders. See the offer above for the minimum spend.`
        : `Free-shipping thresholds change often at ${brand.brand}. Click through to see today's shipping offer at checkout.`,
    },
  ];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function prettyDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// Short bold badge for the coupon card, GrabOn-style, derived from the offer text.
export function discountBadge(offer) {
  const t = offer.title;
  const pct = t.match(/(\d+)\s*%/);
  if (pct) return `${pct[1]}% OFF`;
  // check free-shipping/gift/bogo before the $ match, so "free shipping over $30" isn't "$30 OFF"
  if (/free\s*ship/i.test(t)) return 'FREE SHIP';
  if (/free\s*gift|free\s*travel|free\s*sample/i.test(t)) return 'FREE GIFT';
  if (/bogo|buy one/i.test(t)) return 'BOGO';
  const usd = t.match(/\$(\d+)/);
  if (usd) return `$${usd[1]} OFF`;
  return offer.code ? 'CODE' : 'DEAL';
}

// Auto-derived tags: long-tail SEO pages (/tag/free-shipping etc.) with zero
// extra data — tags fall out of offer titles deterministically.
export const TAGS = {
  'free-shipping': { name: 'Free Shipping', test: (o) => /free\s*ship/i.test(o.title) },
  'sitewide': { name: 'Sitewide', test: (o) => /sitewide|site-wide|everything|entire order/i.test(o.title) },
  'first-order': { name: 'First Order', test: (o) => /first (order|purchase|month)/i.test(o.title) },
  'free-gift': { name: 'Free Gift', test: (o) => /free (gift|sample|travel)/i.test(o.title) },
  'bogo': { name: 'Buy One Get One', test: (o) => /bogo|buy one/i.test(o.title) },
  'student-discount': { name: 'Student Discount', test: (o) => /student|education/i.test(o.title) },
};

export const offerTags = (o) => Object.keys(TAGS).filter((t) => TAGS[t].test(o));
export const brandTags = (b) => [...new Set(b.offers.flatMap(offerTags))];

// Related brands = same category, excluding self (for internal linking / SEO).
export function related(brand, allBrands, n = 6) {
  return allBrands
    .filter((b) => b.category === brand.category && b.slug !== brand.slug)
    .slice(0, n);
}
