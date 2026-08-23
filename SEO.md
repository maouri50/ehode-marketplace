# Ehode SEO and Google Search Console Guide

## What is now in the storefront

Ehode now provides server-generated `<title>`, meta description, canonical, Open Graph, and JSON-LD Product metadata for public product URLs. The site also exposes a dynamic `/sitemap.xml` containing the homepage and published product URLs, plus `/robots.txt` that permits public crawling while keeping `/admin`, `/downloads`, and `/api` out of search results. Product metadata includes a price, currency, availability, image when available, and a direct product URL.

> These changes make public pages easier for crawlers to discover and interpret. They do **not** guarantee a particular ranking, which depends on query relevance, competition, content quality, links, and Google’s own evaluation.

| Public URL | Purpose |
|---|---|
| `https://ehode.com/` | Storefront canonical page |
| `https://ehode.com/products/<handle>` | Canonical product page with Product JSON-LD |
| `https://ehode.com/sitemap.xml` | Dynamic list of public, published URLs |
| `https://ehode.com/robots.txt` | Crawl directives and sitemap discovery |

## Before asking Google to crawl the site

Publish this project to the `ehode.com` domain first, then open the URLs in the table above in a normal browser. Each published product should have a specific, readable title, a truthful description, a useful cover image, a final file attached, a real price or a clearly stated free price, and a relevant category. Do not publish placeholder names or descriptions, because these create weak search landing pages.

Private management and buyer-delivery URLs are intentionally excluded from crawling. This protects the `/admin` workspace and purchase-linked downloads from appearing in search.

## Add the domain to Google Search Console

Open [Google Search Console](https://search.google.com/search-console/about) and choose **Add property**. Select the **Domain** property type and enter `ehode.com`; Google will show a DNS TXT record. Add that TXT record at the company where the `ehode.com` domain is managed, then return to Search Console and click **Verify**. A Domain property covers the domain’s HTTPS and subdomain variants once verification succeeds.[1]

After verification, open **Sitemaps**, enter `sitemap.xml`, and submit it. Google can use submitted sitemaps as a discovery signal; only include canonical, crawlable URLs that you want considered for search.[2]

For an important product, use **URL inspection** in Search Console and request indexing only after the product page is public and complete. Recheck the coverage report periodically rather than repeatedly submitting the same URL.

## Ongoing product SEO workflow

When creating a product in `/admin`, use a specific customer-facing title first, then a concise description that explains what is included and who it is for. Upload an original cover image that accurately depicts the product. Keep pricing, availability, and product files accurate because the structured data reflects the product record. Google’s Product documentation recommends providing the relevant product information through Product structured data and keeping it consistent with the visible page.[3]

| Admin field | SEO guidance |
|---|---|
| Title | Name the product directly; avoid placeholder text, keyword stuffing, or unrelated brand names. |
| Description | Explain contents, format, intended use, and useful details such as number of pages or included file types. |
| Cover image | Use a clear original preview that represents the actual item. |
| Price and status | Keep the public price and publication state accurate. |
| Category | Use the closest relevant category to improve browsing and internal links. |

## References

[1]: https://support.google.com/webmasters/answer/34592 — Google Search Console: Add a property

[2]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap — Google Search Central: Build and submit a sitemap

[3]: https://developers.google.com/search/docs/appearance/structured-data/product — Google Search Central: Product structured data
