// Impact.com promotions API → normalized merchants.
// Env: IMPACT_ACCOUNT_SID, IMPACT_AUTH_TOKEN (API creds from Impact dashboard).
export const name = 'impact';
export const enabled = (env) => !!(env.IMPACT_ACCOUNT_SID && env.IMPACT_AUTH_TOKEN);

export async function crawl(env, { fetchRetry, slugify }) {
  const auth = 'Basic ' + Buffer.from(`${env.IMPACT_ACCOUNT_SID}:${env.IMPACT_AUTH_TOKEN}`).toString('base64');
  const res = await fetchRetry(
    `https://api.impact.com/Mediapartners/${env.IMPACT_ACCOUNT_SID}/Promotions?PageSize=1000`,
    { headers: { Authorization: auth, Accept: 'application/json' } },
  );
  const { Promotions = [] } = await res.json();

  // group promotions by advertiser
  const byMerchant = new Map();
  for (const p of Promotions) {
    const key = p.CampaignName;
    if (!key) continue;
    if (!byMerchant.has(key)) {
      byMerchant.set(key, {
        name: key,
        slug: slugify(key),
        category: p.Category ? p.Category : 'other',
        homepage: p.LandingPageUrl?.match(/^https:\/\/[^/]+/)?.[0] ?? p.LandingPageUrl,
        offers: [],
      });
    }
    byMerchant.get(key).offers.push({
      code: p.CouponCode || null,
      title: p.Description || p.Name,
      expires: p.EndDate?.slice(0, 10) || null,
    });
  }
  return [...byMerchant.values()];
}
