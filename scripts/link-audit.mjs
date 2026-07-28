// Weekly health check: request every merchant's affiliate/homepage URL.
// Exits 1 (fails the CI job → email alert) only on definitive death (404/410).
// Bot walls (403/405/5xx), HEAD refusals, and timeouts are warnings, not
// failures — Best Buy timing out a datacenter HEAD request doesn't mean the
// store is gone.
//   npm run audit
import { readFile } from 'node:fs/promises';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function probe(url, method) {
  return fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
  });
}

const data = JSON.parse(await readFile(new URL('../src/data/deals.json', import.meta.url), 'utf8'));
const dead = [];
const warnings = [];

// ponytail: sequential — 36 merchants is fine; parallelize if the list grows past ~200
for (const b of data.brands) {
  let status;
  try {
    status = (await probe(b.affiliateUrl, 'HEAD')).status;
  } catch {
    status = null;
  }
  // HEAD inconclusive (blocked, refused, or errored) → retry once with GET
  if (status === null || (status >= 400 && status !== 404 && status !== 410)) {
    try {
      status = (await probe(b.affiliateUrl, 'GET')).status;
    } catch (e) {
      warnings.push(`${b.slug}: unreachable (${e.name === 'TimeoutError' ? 'timeout' : e.message})`);
      continue;
    }
  }
  if (status === 404 || status === 410) dead.push(`${b.slug}: HTTP ${status}`);
  else if (status >= 400) warnings.push(`${b.slug}: HTTP ${status} (likely bot wall)`);
}

if (warnings.length) {
  console.warn(`⚠ ${warnings.length} link(s) inconclusive (not failing the job):`);
  warnings.forEach((w) => console.warn('  ' + w));
}
if (dead.length) {
  console.error(`✗ ${dead.length} dead merchant link(s):`);
  dead.forEach((d) => console.error('  ' + d));
  process.exit(1);
}
console.log(`✓ all ${data.brands.length} merchant links healthy (${warnings.length} inconclusive)`);
