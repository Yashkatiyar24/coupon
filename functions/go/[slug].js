// Cloudflare Pages Function: /go/<slug> → 302 to the merchant's affiliate URL.
// Central click point: every outbound click is countable and the affiliate
// mapping can change without touching page HTML. Clicks are written to Workers
// Analytics Engine when the CLICKS binding exists (see wrangler.toml) — query
// CTR in the Cloudflare dashboard (Analytics Engine → coupon_clicks).
export async function onRequestGet({ params, request, env }) {
  const map = await (await env.ASSETS.fetch(new URL('/go-map.json', request.url))).json();
  const url = map[params.slug];
  if (!url) return new Response('Unknown merchant', { status: 404 });

  env.CLICKS?.writeDataPoint({
    blobs: [params.slug, request.headers.get('referer') ?? '', request.headers.get('user-agent') ?? ''],
    doubles: [1],
    indexes: [params.slug],
  });

  return Response.redirect(url, 302);
}
