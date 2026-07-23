import { brands, catName } from '../lib/catalog.js';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function GET(context) {
  const site = (context.site?.href ?? 'https://example.com/').replace(/\/$/, '');
  const items = brands.flatMap((b) =>
    b.offers.map((o) => `  <item>
    <title>${esc(`${b.brand}: ${o.title}`)}</title>
    <link>${site}/${b.slug}-coupon-code</link>
    <guid isPermaLink="false">${b.slug}|${esc(o.code || o.title)}</guid>
    <category>${esc(catName(b.category))}</category>
    <description>${esc(`${o.code ? `Use code ${o.code} — ` : ''}${o.title} at ${b.brand}.`)}</description>
  </item>`),
  );
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>CouponHub — Latest Coupons &amp; Deals</title>
  <link>${site}/</link>
  <description>Verified coupon codes and deals across fashion, electronics, home, beauty, health, and travel.</description>
${items.join('\n')}
</channel>
</rss>`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  );
}
