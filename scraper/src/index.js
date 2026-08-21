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
      links.push(new URL(href, pageUrl).toString());
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

function extractBookDetails(html, bookUrl, sourcePage) {
  const $ = cheerio.load(html);
  const main = $('.product_main');

  const title = main.find('h1').text().trim();

  const priceText = $('.product_main .price_color').first().text().trim();

  const availabilityText = $('.product_main .availability').text().trim();

  // Rating is stored as a CSS class, e.g. class="star-rating Three"
  const ratingClass = $('.product_main p.star-rating').attr('class') || '';
  const ratingText = ratingClass.replace('star-rating', '').trim();

  // Not every book has a description — store null if missing, never invent it
  const descriptionEl = $('#product_description').nextAll('p').first();
  const description = descriptionEl.length ? descriptionEl.text().trim() : null;

  return {
    title,
    product_url: bookUrl,
    price_text: priceText,
    availability_text: availabilityText,
    rating_text: ratingText,
    description,
    source_page: sourcePage,
    fetched_at: new Date().toISOString(),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Turns a book URL into a safe, unique cache filename
function cacheFilenameForUrl(url) {
  const slug = new URL(url).pathname
    .replace(/^\/catalogue\//, '')
    .replace(/\/index\.html$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  return `book-${slug}.html`;
}

async function main() {
  await mkdir('cache', { recursive: true });

  // --- Stage 2: discover catalogue pages and book links ---
  let currentUrl = 'https://books.toscrape.com/catalogue/page-1.html';
  let pageNumber = 1;
  let allLinks = [];
  const linkSourcePage = new Map(); // bookUrl -> which catalogue page it came from

  while (currentUrl) {
    const cachePath = path.join('cache', `catalogue-page-${pageNumber}.html`);
    const { html, fromCache } = await fetchWithCache(currentUrl, cachePath);

    const linksOnThisPage = extractBookLinks(html, currentUrl);
    for (const link of linksOnThisPage) {
      linkSourcePage.set(link, currentUrl);
    }
    allLinks = allLinks.concat(linksOnThisPage);

    const nextUrl = findNextPageUrl(html, currentUrl);

    if (!fromCache && nextUrl) {
      await sleep(DELAY_MS);
    }

    currentUrl = nextUrl;
    pageNumber += 1;

    if (pageNumber > 3) break;
  }

  const uniqueLinks = [...new Set(allLinks)];
  console.log(`catalogue_pages=${pageNumber - 1}`);
  console.log(`discovered=${allLinks.length}`);
  console.log(`unique_urls=${uniqueLinks.length}`);

  // --- Stage 3: visit each book page and extract raw records ---
  const records = [];

  for (const bookUrl of uniqueLinks) {
    const cachePath = path.join('cache', cacheFilenameForUrl(bookUrl));
    const { html, fromCache } = await fetchWithCache(bookUrl, cachePath);

    const record = extractBookDetails(html, bookUrl, linkSourcePage.get(bookUrl));
    records.push(record);

    if (!fromCache) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`detail_pages=${records.length}`);
  console.log('Sample record:');
  console.log(JSON.stringify(records[0], null, 2));
}

main().catch((err) => {
  console.error('Run failed:', err.message);
  process.exit(1);
});