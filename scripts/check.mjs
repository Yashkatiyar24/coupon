// Post-build check: fails (exit 1) if any generated page is missing a <title>
// or has a broken affiliate link. Run after `npm run build`.
//   node scripts/check.mjs
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';

async function htmlFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function isValidHttpUrl(href) {
  try {
    const u = new URL(href);
    return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname;
  } catch {
    return false;
  }
}

const errors = [];
const files = await htmlFiles(DIST);

// /go/<slug> links resolve via the generated redirect map — load it once
let goMap = {};
try {
  goMap = JSON.parse(await readFile(join(DIST, 'go-map.json'), 'utf8'));
} catch {
  errors.push('dist/go-map.json missing — /go/ redirects would all 404');
}

for (const file of files) {
  const html = await readFile(file, 'utf8');

  // 1. non-empty <title>
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (!title) errors.push(`${file}: missing or empty <title>`);

  // 2. affiliate links (marked data-aff) must be valid absolute URLs w/o TODO leftovers
  const affHrefs = [...html.matchAll(/<a\b[^>]*\bdata-aff\b[^>]*\bhref="([^"]*)"/gi)].map((m) => m[1]);
  for (const href of affHrefs) {
    if (!href) errors.push(`${file}: affiliate link with empty href`);
    else if (href === '#' || href.startsWith('javascript:')) errors.push(`${file}: dead affiliate href "${href}"`);
    else if (href.startsWith('/go/')) {
      const target = goMap[href.slice(4)];
      if (!target) errors.push(`${file}: /go/ link with no map entry "${href}"`);
      else if (!isValidHttpUrl(target)) errors.push(`${file}: /go/ target invalid "${target}"`);
    } else if (!isValidHttpUrl(href)) errors.push(`${file}: invalid affiliate URL "${href}"`);
  }
}

if (errors.length) {
  console.error(`✗ check failed — ${errors.length} problem(s):`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`✓ check passed — ${files.length} pages, all have titles and valid affiliate links.`);
