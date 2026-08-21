import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const USER_AGENT = 'FlyRankInternshipA9/1.0 (+https://github.com/farida-abdallah12/task-api-js)';
const TIMEOUT_MS = 5000;
const DELAY_MS = 500;

async function fetchWithCache(url, cachePath) {
  if (existsSync(cachePath)) {
    const cached = await readFile(cachePath, 'utf-8');
    console.log(`CACHE HIT — ${cachePath} (${cached.length} bytes)`);
    return { html: cached, fromCache: true };
  }

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

  if (response.status !== 200) {
    throw new Error(`Fetch failed for ${url} — status ${response.status}`);
  }

  const html = await response.text();
  await writeFile(cachePath, html, 'utf-8');
  console.log(`FETCH — ${url} (${html.length} bytes)`);

  return { html, fromCache: false };
}

function extractBookLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  const links = [];

  $('article.product_pod').each((_, el) => {
    const href = $(el).find('h3 a').attr('href');
    if (href) {
      const absoluteUrl = new URL(href, pageUrl).toString();
      links.push(absoluteUrl);
    }
  });

  return links;
}

function findNextPageUrl(html, pageUrl) {
  const $ = cheerio.load(html);
  const nextHref = $('li.next > a').attr('href');
  if (!nextHref) return null;
  return new URL(nextHref, pageUrl).toString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  await mkdir('cache', { recursive: true });

  let currentUrl = 'https://books.toscrape.com/catalogue/page-1.html';
  let pageNumber = 1;
  let allLinks = [];

  while (currentUrl) {
    const cachePath = path.join('cache', `catalogue-page-${pageNumber}.html`);
    const { html, fromCache } = await fetchWithCache(currentUrl, cachePath);

    const linksOnThisPage = extractBookLinks(html, currentUrl);
    allLinks = allLinks.concat(linksOnThisPage);

    const nextUrl = findNextPageUrl(html, currentUrl);

    // Only delay if we actually hit the real site (not cache),
    // and only if we're about to make another real request.
    if (!fromCache && nextUrl) {
      await sleep(DELAY_MS);
    }

    currentUrl = nextUrl;
    pageNumber += 1;

    // Assignment scope: only the first 3 catalogue pages
    if (pageNumber > 3) break;
  }

  const uniqueLinks = [...new Set(allLinks)];

  console.log(`catalogue_pages=${pageNumber - 1}`);
  console.log(`discovered=${allLinks.length}`);
  console.log(`unique_urls=${uniqueLinks.length}`);
}

main().catch((err) => {
  console.error('Run failed:', err.message);
  process.exit(1);
});