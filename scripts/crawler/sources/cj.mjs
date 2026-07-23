// CJ (Commission Junction) link-search API → normalized merchants.
// Env: CJ_API_TOKEN (personal access token), CJ_WEBSITE_ID (your PID).
export const name = 'cj';
export const enabled = (env) => !!(env.CJ_API_TOKEN && env.CJ_WEBSITE_ID);

export async function crawl(env, { fetchRetry, slugify }) {
  const res = await fetchRetry(
    `https://link-search.api.cj.com/v2/link-search?website-id=${env.CJ_WEBSITE_ID}&link-type=Text%20Link&promotion-type=coupon&records-per-page=1000`,
    { headers: { Authorization: `Bearer ${env.CJ_API_TOKEN}` } },
  );
  const xml = await res.text();

  // minimal XML pull — the fields we need, no parser dependency
  const links = [...xml.matchAll(/<link>([\s\S]*?)<\/link>/g)].map(([, block]) => {
    const g = (tag) => block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]?.trim() ?? '';
    return {
      advertiser: g('advertiser-name'),
      category: g('category'),
      code: g('coupon-code'),
      title: g('link-name'),
      expires: g('promotion-end-date')?.slice(0, 10),
      dest: g('destination'),
    };
  });

  const byMerchant = new Map();
  for (const l of links) {
    if (!l.advertiser) continue;
    if (!byMerchant.has(l.advertiser)) {
      byMerchant.set(l.advertiser, {
        name: l.advertiser,
        slug: slugify(l.advertiser),
        category: l.category || 'other',
        homepage: l.dest?.match(/^https:\/\/[^/]+/)?.[0] ?? `https://${slugify(l.advertiser)}.com`,
        offers: [],
      });
    }
    byMerchant.get(l.advertiser).offers.push({ code: l.code || null, title: l.title, expires: l.expires || null });
  }
  return [...byMerchant.values()];
}
