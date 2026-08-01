// Rakuten Advertising coupon feed → normalized merchants.
// Env: RAKUTEN_API_TOKEN (Web Services token from the Rakuten dashboard).
// Feed is XML; joined advertisers only — same guarantee as the CJ source.
export const name = 'rakuten';
export const enabled = (env) => !!env.RAKUTEN_API_TOKEN;

export async function crawl(env, { fetchRetry, slugify }) {
  const res = await fetchRetry(
    `https://api.linksynergy.com/coupon/1.0?resultsperpage=500&token=${env.RAKUTEN_API_TOKEN}`,
  );
  const xml = await res.text();

  const links = [...xml.matchAll(/<link[ >]([\s\S]*?)<\/link>/g)].map(([, block]) => {
    const g = (tag) => block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]?.trim() ?? '';
    return {
      advertiser: g('advertisername'),
      mid: g('advertiserid'),
      title: g('offerdescription'),
      code: g('couponcode'),
      expires: g('offerenddate')?.slice(0, 10),
      dest: g('clickurl'),
    };
  });

  const byMerchant = new Map();
  for (const l of links) {
    if (!l.advertiser || !l.title) continue;
    if (!byMerchant.has(l.advertiser)) {
      byMerchant.set(l.advertiser, {
        name: l.advertiser,
        slug: slugify(l.advertiser),
        category: 'other',
        homepage: l.dest?.match(/murl=([^&]+)/)?.[1]
          ? decodeURIComponent(l.dest.match(/murl=([^&]+)/)[1]).match(/^https:\/\/[^/]+/)?.[0] ?? `https://${slugify(l.advertiser)}.com`
          : `https://${slugify(l.advertiser)}.com`,
        aff: l.mid ? { network: 'rakuten', mid: l.mid } : undefined,
        offers: [],
      });
    }
    byMerchant.get(l.advertiser).offers.push({ code: l.code || null, title: l.title, expires: l.expires || null });
  }
  return [...byMerchant.values()];
}
