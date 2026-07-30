// slug → affiliate URL map consumed by the /go/[slug] redirect function.
// Offers with their own deeplink (o.id + o.url) get an entry alongside brands.
import { brands } from '../lib/catalog.js';

export function GET() {
  const map = Object.fromEntries(brands.map((b) => [b.slug, b.affiliateUrl]));
  for (const b of brands)
    for (const o of b.offers) if (o.id && o.url) map[o.id] = o.url;
  return new Response(JSON.stringify(map), { headers: { 'Content-Type': 'application/json' } });
}
