// Local JSON-file source — used by the pipeline self-test and as the template
// for adding any new feed (RSS/CSV/JSON): implement enabled() + crawl().
// Env: CRAWLER_FIXTURE=/path/to/feed.json
import { readFile } from 'node:fs/promises';

export const name = 'fixture';
export const enabled = (env) => !!env.CRAWLER_FIXTURE;

export async function crawl(env) {
  return JSON.parse(await readFile(env.CRAWLER_FIXTURE, 'utf8'));
}
