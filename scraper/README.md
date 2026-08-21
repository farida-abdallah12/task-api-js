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