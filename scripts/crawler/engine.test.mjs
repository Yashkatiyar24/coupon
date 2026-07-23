// Crawler pipeline self-test: runs the real engine against a fixture feed on a
// COPY of deals.json, asserts every pipeline rule, restores the original.
//   npm run crawl:test
import { readFile, writeFile, copyFile, rm, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const DEALS = new URL('../../src/data/deals.json', import.meta.url);
const BAK = new URL('../../src/data/.deals.bak.json', import.meta.url);
const FIXTURE = new URL('./fixtures/test-feed.json', import.meta.url);
await mkdir(new URL('./fixtures/', import.meta.url), { recursive: true });

const future = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
const past = '2020-01-01';

await writeFile(FIXTURE, JSON.stringify([
  { // existing merchant → offers replaced, dedupe + expiry applied
    name: 'Nike', category: 'fashion', homepage: 'https://www.nike.com/?irclickid=SRC_TRACKING',
    offers: [
      { code: 'NEW30', title: '30% off everything', expires: future },
      { code: 'NEW30', title: '30% off everything', expires: future },   // dup → dropped
      { code: 'OLD10', title: '10% off (expired)', expires: past },      // expired → dropped
      { title: 'Free shipping over $75', expires: null },
    ],
  },
  { // brand-new merchant in a brand-new category → both auto-added
    name: 'Chewy', category: 'Pet Supplies', categoryName: 'Pet Supplies',
    homepage: 'https://www.chewy.com/', description: 'Pet food and supplies delivered.',
    offers: [{ code: 'PETS20', title: '20% off first Autoship', expires: future }],
  },
  { name: '', category: 'x', homepage: 'https://x.com', offers: [] },    // invalid → skipped
]));

await copyFile(DEALS, BAK);
try {
  process.env.CRAWLER_FIXTURE = FIXTURE.pathname;
  process.env.AWIN_AFF_ID = '999001'; // pretend we're enrolled: chewy via awin below
  const { run } = await import('./engine.mjs');

  // temporarily map chewy → awin so the affiliate engine has a complete mapping
  const AFF = new URL('../../src/data/affiliates.json', import.meta.url);
  const affBak = await readFile(AFF, 'utf8');
  const aff = JSON.parse(affBak);
  aff.chewy = { network: 'awin', mid: '12345' };
  await writeFile(AFF, JSON.stringify(aff));

  try {
    const { data, updated, added } = await run(process.env);

    const nike = data.brands.find((b) => b.slug === 'nike');
    assert.equal(nike.offers.length, 2, 'nike: dup + expired dropped');
    assert.equal(nike.offers[0].code, 'NEW30');
    assert.ok(!nike.affiliateUrl.includes('irclickid'), 'source tracking stripped');

    const chewy = data.brands.find((b) => b.slug === 'chewy');
    assert.ok(chewy, 'new merchant auto-added');
    assert.equal(chewy.category, 'pet-supplies');
    assert.ok(data.categories.some((c) => c.slug === 'pet-supplies'), 'new category auto-added');
    assert.ok(chewy.affiliateUrl.startsWith('https://www.awin1.com/cread.php?awinmid=12345&awinaffid=999001'),
      'affiliate URL is OURS via awin mapping');

    assert.equal(updated, 1); assert.equal(added, 1);
    console.log('✓ crawler pipeline test passed (merge, auto-add, dedupe, expiry, affiliate rewrite)');
  } finally {
    await writeFile(AFF, affBak);
  }
} finally {
  await copyFile(BAK, DEALS);
  await rm(BAK); await rm(FIXTURE);
}
