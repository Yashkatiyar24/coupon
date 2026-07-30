// Deterministic, varied page copy so each of the 3 URL patterns per brand
// reads differently (avoids thin/duplicate-content penalties). No randomness:
// same brand+pattern always renders the same text, so builds are reproducible.
import { catName } from './catalog.js';

// readable category phrase for prose, from the taxonomy (e.g. "home & kitchen")
const cat = (brand) => catName(brand.category).toLowerCase();

// Build-time "August 2026" stamp for titles/meta. CI rebuilds every 6h, so the
// month in every <title> stays current without hand edits — Google favors
// freshness signals in coupon SERPs.
const _d = new Date();
export const NOW = `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][_d.getMonth()]} ${_d.getFullYear()}`;

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
    'coupon-code': `${brand.brand} Coupon Codes & Promo Codes (${NOW})`,
    'promo-code-2026': `${brand.brand} Promo Code 2026 — Verified Discounts`,
    'discount': `${brand.brand} Discounts & Deals — Save Today`,
  };
  return map[pattern.key];
}

export function metaDescription(brand, pattern) {
  const active = brand.offers.length;
  const map = {
    'coupon-code': `Browse ${active} ${brand.brand} coupon codes for ${NOW}. Stack promo codes and free-shipping deals on ${cat(brand)} before you check out.`,
    'promo-code-2026': `Latest ${brand.brand} promo codes for 2026. Get verified discounts on ${cat(brand)} — updated regularly so you never pay full price.`,
    'discount': `Save on ${brand.brand} with today's ${active} discounts and deals. Current offers on ${cat(brand)}, updated for ${NOW}.`,
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
        ? `Yes — there ${brand.offers.length === 1 ? 'is' : 'are'} ${brand.offers.length} active ${brand.brand} offer${brand.offers.length === 1 ? '' : 's'} listed above for ${NOW}, including code and deal savings.`
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
// emoji + blurb drive the tag page hero; blurb doubles as SEO intro copy.
export const TAGS = {
  'free-shipping': {
    name: 'Free Shipping', emoji: '📦',
    blurb: 'Skip the delivery fee entirely. Every offer below ships free — either sitewide or past a small minimum spend — so the price you see in the cart is the price you pay.',
    test: (o) => /free\s*ship/i.test(o.title),
  },
  'sitewide': {
    name: 'Sitewide', emoji: '🏷️',
    blurb: 'Codes and deals that work on everything in the store — no category restrictions, no exclusion lists to read. Stack one on a sale item and save twice.',
    test: (o) => /sitewide|site-wide|everything|entire order/i.test(o.title),
  },
  'first-order': {
    name: 'First Order', emoji: '✨',
    blurb: 'Shopping somewhere for the first time? These welcome offers give new customers the biggest single discount most stores ever publish.',
    test: (o) => /first (order|purchase|month)/i.test(o.title),
  },
  'free-gift': {
    name: 'Free Gift', emoji: '🎁',
    blurb: 'Spend what you were already going to spend and walk away with extra — samples, minis, and full-size gifts added free at checkout.',
    test: (o) => /free (gift|sample|travel)/i.test(o.title),
  },
  'bogo': {
    name: 'Buy One Get One', emoji: '➕',
    blurb: 'Double up for less. These buy-one-get-one offers effectively cut the per-item price in half — best value when you were buying two anyway.',
    test: (o) => /bogo|buy one/i.test(o.title),
  },
  'student-discount': {
    name: 'Student Discount', emoji: '🎓',
    blurb: 'Verified student pricing from top brands. Most verify once through your school email and keep the discount all year.',
    test: (o) => /student|education/i.test(o.title),
  },
  'back-to-school': {
    name: 'Back to School', emoji: '🎒',
    blurb: 'Backpacks, stationery, dorm gear, and student laptops — the seasonal offers that make the school run cheaper, in the US, UK, and India.',
    test: (o) => /back[ -]?to[ -]?school|school (supplies|bags|essentials)|dorm|stationery/i.test(o.title),
  },
  'tv-deals': {
    name: 'TV Deals', emoji: '📺',
    blurb: 'Current discounts on 4K, OLED, and smart TVs from Samsung, LG, Sony, and more — including seasonal price drops that beat MSRP by hundreds.',
    test: (o) => /\b(tv|tvs|television|televisions|oled)\b/i.test(o.title),
  },
  'iphone-deals': {
    name: 'iPhone Deals', emoji: '📱',
    blurb: 'Savings on current and previous-generation iPhones — trade-in credit, renewed models, bank offers, and carrier-free discounts across regions.',
    test: (o) => /iphone/i.test(o.title),
  },
  'laptop-deals': {
    name: 'Laptop Deals', emoji: '💻',
    blurb: 'Work, school, and gaming laptops at real discounts — from budget Chromebooks to flagship ultrabooks, updated as prices drop.',
    test: (o) => /laptop/i.test(o.title),
  },
  'ac-deals': {
    name: 'Air Conditioner Deals', emoji: '❄️',
    blurb: 'Beat the heat for less: window, portable, and split air conditioners with seasonal markdowns — plus no-cost EMI options in India.',
    test: (o) => /air[ -]?conditioner/i.test(o.title),
  },
  'kitchen-deals': {
    name: 'Kitchen Deals', emoji: '🍳',
    blurb: 'Air fryers, stand mixers, espresso machines, and cookware at their lowest recent prices — everything for the kitchen, minus the markup.',
    test: (o) => /kitchen|air fryer|stand mixer|espresso|kettle|cookware/i.test(o.title),
  },
  'diwali-sale': {
    name: 'Diwali Sale', emoji: '🪔',
    blurb: 'Festive-season savings for India — Diwali offers and Great Indian Festival deals on electronics, home, fashion, and gifts.',
    test: (o) => /diwali|great indian festival|festive/i.test(o.title),
  },
};

// Region badge for region-specific storefronts (brand.region in deals.json).
// Brands with no region are US-market by default and show no badge.
export const REGIONS = {
  IN: { flag: '🇮🇳', name: 'India' },
  UK: { flag: '🇬🇧', name: 'UK & Europe' },
  US: { flag: '🇺🇸', name: 'United States' },
};

// FAQ block for tag pages — mirrors the brand-page FAQ so every tag page has
// unique long-form content + FAQPage structured data.
export function tagFaqs(def, matches, total) {
  const stores = matches.map((m) => m.brand.brand);
  const top = stores.slice(0, 3).join(', ');
  const codes = matches.reduce((n, m) => n + m.offers.filter((o) => o.code).length, 0);
  const regions = [...new Set(matches.map((m) => m.brand.region).filter(Boolean))];
  const list = [
    {
      q: `What are the best ${def.name.toLowerCase()} offers right now?`,
      a: `We're tracking ${total} verified ${def.name.toLowerCase()} offer${total === 1 ? '' : 's'} from ${stores.length} store${stores.length === 1 ? '' : 's'}, including ${top}. The list above is rebuilt from our deal feed regularly, so expired offers drop out automatically.`,
    },
    {
      q: `Do I need a coupon code for these ${def.name.toLowerCase()} deals?`,
      a: codes
        ? `Some do — ${codes} of the offers above use a code you copy and paste at checkout. The rest apply automatically when you shop through the link.`
        : `No — every offer above applies automatically when you shop through the link. No code to copy, nothing to paste at checkout.`,
    },
    {
      q: `How often is this ${def.name.toLowerCase()} page updated?`,
      a: `Continuously. Our feed re-checks offers several times a day, prunes anything expired, and adds new ${def.name.toLowerCase()} deals as stores launch them — so this page reflects what actually works today.`,
    },
  ];
  if (regions.length) {
    list.push({
      q: `Which countries do these offers work in?`,
      a: `Offers marked with a region badge are for that storefront (${regions.map((r) => REGIONS[r].name).join(', ')}); unmarked offers are from US stores. Click through and the store will confirm delivery options for your address.`,
    });
  }
  return list;
}

export const offerTags = (o) => Object.keys(TAGS).filter((t) => TAGS[t].test(o));
export const brandTags = (b) => [...new Set(b.offers.flatMap(offerTags))];

// Related brands = same category, excluding self (for internal linking / SEO).
export function related(brand, allBrands, n = 6) {
  return allBrands
    .filter((b) => b.category === brand.category && b.slug !== brand.slug)
    .slice(0, n);
}
