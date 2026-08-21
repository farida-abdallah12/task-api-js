# The Polite Scraper

## Target classification

- **Site:** https://books.toscrape.com
- **Why this site is appropriate:** Confirmed via toscrape.com — it is explicitly
  described as a fictional bookstore built for people to practice web scraping on,
  with 1,000 items, pagination, and no JavaScript required. It exists specifically
  for this purpose.
- **Scope:** The first 3 catalogue pages only (60 books total).
- **robots.txt result:** Requesting https://books.toscrape.com/robots.txt returns
  a 404 Not Found. No robots file exists on this site — this is treated as "no
  robots file found," not as blanket permission.
- **Data collected:** Book title, price, availability, star rating, and
  description — all publicly displayed on the page.

I will not reuse this code on another site without checking its rules and terms first.

## How to run

\```bash
cd scraper
npm install
npm start
\```

Requires Node.js 20+. No API keys, credit cards, or paid services needed.

## Record schema

Each book in `output/books.json` has:

| Field               | Type            | Notes                                      |
|---------------------|-----------------|---------------------------------------------|
| title               | string          | Book title                                  |
| product_url         | string (URL)    | Canonical/absolute URL, used as identity    |
| price_text          | string          | Original text, e.g. "£51.77"                |
| price_gbp           | number          | Cleaned numeric price                       |
| availability_text   | string          | Original stock text                         |
| rating_text         | string          | e.g. "Three"                                |
| description         | string or null  | null when the page has no description       |
| source_page         | string (URL)    | Which catalogue page this book was found on |
| fetched_at          | string (ISO)    | Timestamp of when this page was fetched     |

Records that fail validation are written to `output/errors.json` with a reason,
never to `books.json`.

## Politeness rules followed

- **User-Agent:** every request identifies as `FlyRankInternshipA9/1.0`
  with a link back to this repo.
- **Timeout:** every request gives up after 5 seconds rather than hanging.
- **Delay:** at least 500ms between real requests to the site. Cached pages
  are read instantly with no delay, since they never leave this computer.
- **Caching:** every page fetched is saved under `cache/` (git-ignored) and
  reused on subsequent runs instead of re-requesting it.
- **Retry rules:** timeouts and 5xx errors get one retry after a short pause.
  404s and 403s are never retried.

## Sample run report

\```json
{
  "start_time": "2026-08-21T22:35:24.015Z",
  "duration_ms": 1564,
  "pages_fetched": 0,
  "cache_hits": 63,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0,
  "failures": []
}
\```

## Why no browser was needed

The book data (title, price, availability, description) is already present in
the raw HTML the server sends — there's no JavaScript rendering step required
to reveal it. Using a full browser (e.g. Playwright) here would only add
startup time and memory overhead with no benefit.

## Ethics note

This scraper only targets a sandbox explicitly built for scraping practice.
In general: prefer an official API when one exists, never bypass logins,
paywalls, or explicit blocks, and collect only the data actually needed for
the task at hand.

## Known limitation

Some book descriptions on the source site contain duplicated or truncated
text (e.g. a sentence repeating mid-word). This is preserved as-is — the
scraper extracts raw text faithfully rather than "correcting" content that
looks odd, since altering scraped text would violate the "trust nothing you
scraped, but never invent what wasn't there" principle.