// Awin promotions API → normalized merchants.
// Env: AWIN_API_TOKEN, AWIN_PUBLISHER_ID.
export const name = 'awin';
export const enabled = (env) => !!(env.AWIN_API_TOKEN && env.AWIN_PUBLISHER_ID);

export async function crawl(env, { fetchRetry, slugify }) {
  const res = await fetchRetry(
    `https://api.awin.com/publisher/${env.AWIN_PUBLISHER_ID}/promotions?type=promotion&relationship=joined`,
    { headers: { Authorization: `Bearer ${env.AWIN_API_TOKEN}` } },
  );
  const promos = (await res.json())?.data ?? [];

  const byMerchant = new Map();
  for (const p of promos) {
    const adv = p.advertiser?.name;
    if (!adv) continue;
    if (!byMerchant.has(adv)) {
      byMerchant.set(adv, {
        name: adv,
        slug: slugify(adv),
        category: p.categories?.[0]?.name || 'other',
        homepage: p.url?.match(/^https:\/\/[^/]+/)?.[0] ?? `https://${slugify(adv)}.com`,
        offers: [],
      });
    }
    byMerchant.get(adv).offers.push({
      code: p.voucher?.code || null,
      title: p.title || p.description,
      expires: p.endDate?.slice(0, 10) || null,
    });
  }
  return [...byMerchant.values()];
}
