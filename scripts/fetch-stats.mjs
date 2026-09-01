/**
 * Fetches LeetCode solve counts at build time and bakes them into static HTML.
 *
 * Doing this at build rather than in the browser means no client-side request,
 * no CORS proxy, and no layout shift when the numbers arrive.
 *
 * If the API is unreachable the previously committed values are kept. A flaky
 * third party must never fail the deploy.
 */
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'leetcode.json');
const USERNAME = 'mayankpall';

const QUERY = `{
  matchedUser(username: "${USERNAME}") {
    submitStats { acSubmissionNum { difficulty count } }
  }
}`;

async function main() {
  let previous = null;
  try {
    previous = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    // First run — nothing committed yet.
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const nums = json?.data?.matchedUser?.submitStats?.acSubmissionNum;
    if (!Array.isArray(nums) || nums.length === 0) throw new Error('unexpected shape');

    const by = (d) => nums.find((n) => n.difficulty === d)?.count ?? 0;
    const stats = {
      total: by('All'),
      easy: by('Easy'),
      medium: by('Medium'),
      hard: by('Hard'),
      fetchedAt: new Date().toISOString().slice(0, 10),
    };

    if (stats.total === 0) throw new Error('zero total, refusing to overwrite');

    await writeFile(OUT, JSON.stringify(stats, null, 2) + '\n');
    console.log(`[stats] LeetCode: ${stats.total} solved (${stats.easy}/${stats.medium}/${stats.hard})`);
  } catch (err) {
    console.warn(`[stats] LeetCode fetch failed (${err.message}) — keeping committed values.`);
    if (!previous) {
      // No committed fallback and no network: write a shape the build can render.
      await writeFile(
        OUT,
        JSON.stringify({ total: 0, easy: 0, medium: 0, hard: 0, fetchedAt: null }, null, 2) + '\n',
      );
    }
  }
}

main();
