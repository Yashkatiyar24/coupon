// Weekly health check: HEAD-request every merchant's affiliate/homepage URL.
// Exits 1 (fails the CI job → email alert) if any link is dead.
//   npm run audit
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../src/data/deals.json', import.meta.url), 'utf8'));
const dead = [];

// ponytail: sequential with 5s timeout — 36 merchants is fine; parallelize if the list grows past ~200
for (const b of data.brands) {
  try {
    const res = await fetch(b.affiliateUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CouponHubBot/1.0; link-audit)' },
    });
    // 403/405 = bot-blocked or HEAD-refused, not dead; only hard failures count
    if (res.status >= 500 || res.status === 404 || res.status === 410) dead.push(`${b.slug}: HTTP ${res.status}`);
  } catch (e) {
    dead.push(`${b.slug}: ${e.name === 'TimeoutError' ? 'timeout' : e.message}`);
  }
}

if (dead.length) {
  console.error(`✗ ${dead.length} dead merchant link(s):`);
  dead.forEach((d) => console.error('  ' + d));
  process.exit(1);
}
console.log(`✓ all ${data.brands.length} merchant links healthy`);
