// slug → affiliate URL map consumed by the /go/[slug] redirect function.
import { brands } from '../lib/catalog.js';

export function GET() {
  const map = Object.fromEntries(brands.map((b) => [b.slug, b.affiliateUrl]));
  return new Response(JSON.stringify(map), { headers: { 'Content-Type': 'application/json' } });
}
