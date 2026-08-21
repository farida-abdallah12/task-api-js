import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const USER_AGENT = 'FlyRankInternshipA9/1.0 (+https://github.com/farida-abdallah12/task-api-js)';
const TIMEOUT_MS = 5000;

async function fetchWithCache(url, cachePath) {
  // Step 3: check the cache first
  if (existsSync(cachePath)) {
    const cached = await readFile(cachePath, 'utf-8');
    console.log(`CACHE HIT — ${cachePath} (${cached.length} bytes)`);
    return cached;
  }

  // Step 4: make the real request, politely
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  // Step 5: check the status code
  if (response.status !== 200) {
    throw new Error(`Fetch failed for ${url} — status ${response.status}`);
  }

  const html = await response.text();

  // Step 6: save to cache
  await writeFile(cachePath, html, 'utf-8');
  console.log(`FETCH — ${url} (${html.length} bytes)`);

  return html;
}

async function main() {
  await mkdir('cache', { recursive: true });

  const url = 'https://books.toscrape.com/catalogue/page-1.html';
  const cachePath = path.join('cache', 'catalogue-page-1.html');

  await fetchWithCache(url, cachePath);
}

main().catch((err) => {
  console.error('Run failed:', err.message);
  process.exit(1);
});