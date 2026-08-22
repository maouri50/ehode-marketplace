import { and, count, eq } from "drizzle-orm";
import { catalogCategories, marketplaceListings, productAssets } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

const publishedListing = eq(marketplaceListings.status, "published");

type SeoPage = {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string | null;
  robots?: string;
  structuredData: Record<string, unknown> | Record<string, unknown>[];
  crawlableContent?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character));
}

function plainText(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function shorten(value: string, length = 155) {
  return value.length > length ? `${value.slice(0, length - 1).trimEnd()}…` : value;
}

export function absoluteUrl(pathname: string) {
  return new URL(pathname, ENV.canonicalOrigin).toString();
}

function homeSeo(crawlableContent?: string): SeoPage {
  const description = "Ehode offers thoughtfully designed printable templates, SVG bundles, and digital downloads for creative projects.";
  return {
    title: `${ENV.siteName} | Digital downloads for creative projects`,
    description,
    canonicalPath: "/",
    crawlableContent,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: ENV.siteName,
      url: ENV.canonicalOrigin,
      description,
    },
  };
}

function privateSeo(pathname: string): SeoPage {
  return {
    title: `${ENV.siteName} | Private workspace`,
    description: "Private workspace for Ehode.",
    canonicalPath: pathname,
    robots: "noindex, nofollow, noarchive",
    structuredData: { "@context": "https://schema.org", "@type": "WebPage", name: "Private workspace" },
  };
}

export async function getSeoPage(pathname: string): Promise<SeoPage> {
  if (pathname.startsWith("/admin") || pathname.startsWith("/downloads")) return privateSeo(pathname);
  const productMatch = pathname.match(/^\/products\/([^/?#]+)$/);
  if (!productMatch) {
    const db = await getDb();
    if (!db) return homeSeo();
    const listings = await db.select({
      handle: marketplaceListings.handle,
      title: marketplaceListings.title,
      description: marketplaceListings.description,
      priceAmount: marketplaceListings.priceAmount,
      currencyCode: marketplaceListings.currencyCode,
    }).from(marketplaceListings).where(publishedListing).orderBy(marketplaceListings.title).limit(24);
    const cards = listings.map((listing) => `<li><a href="/products/${encodeURIComponent(listing.handle)}">${escapeHtml(listing.title)}</a><p>${escapeHtml(shorten(plainText(listing.description) || "Digital download from Ehode.", 180))}</p><p>${Number(listing.priceAmount) === 0 ? "Free" : `${escapeHtml(listing.currencyCode)} ${escapeHtml(listing.priceAmount)}`}</p></li>`).join("");
    const crawlableContent = `<main data-seo-public-content="home"><header><p>Digital downloads for creative projects</p><h1>${escapeHtml(ENV.siteName)} digital downloads</h1><p>Discover printable templates, SVG bundles, and digital resources for creative projects.</p></header><section aria-labelledby="seo-catalog"><h2 id="seo-catalog">Digital downloads</h2><ul>${cards}</ul></section></main>`;
    return homeSeo(crawlableContent);
  }

  const db = await getDb();
  if (!db) return homeSeo();
  const rows = await db.select({
    handle: marketplaceListings.handle,
    title: marketplaceListings.title,
    description: marketplaceListings.description,
    priceAmount: marketplaceListings.priceAmount,
    currencyCode: marketplaceListings.currencyCode,
    coverImageUrl: marketplaceListings.coverImageUrl,
    productType: marketplaceListings.productType,
    category: catalogCategories.name,
    assetCount: count(productAssets.id),
  }).from(marketplaceListings)
    .leftJoin(catalogCategories, eq(marketplaceListings.categoryId, catalogCategories.id))
    .leftJoin(productAssets, eq(productAssets.listingId, marketplaceListings.id))
    .where(and(publishedListing, eq(marketplaceListings.handle, decodeURIComponent(productMatch[1] ?? ""))))
    .groupBy(marketplaceListings.id, catalogCategories.id)
    .limit(1);
  const product = rows[0];
  if (!product) return homeSeo();

  const description = shorten(plainText(product.description) || `Download ${product.title} from ${ENV.siteName}.`);
  const isFree = Number(product.priceAmount) === 0;
  const availability = product.assetCount > 0 ? "https://schema.org/InStock" : "https://schema.org/PreOrder";
  const canonicalPath = `/products/${encodeURIComponent(product.handle)}`;
  const crawlableContent = `<main data-seo-public-content="product"><nav aria-label="Breadcrumb"><a href="/">${escapeHtml(ENV.siteName)}</a> / <span>${escapeHtml(product.category ?? product.productType ?? "Digital download")}</span></nav><article><h1>${escapeHtml(product.title)}</h1><p>${escapeHtml(description)}</p><p>${isFree ? "Free digital download" : `${escapeHtml(product.currencyCode)} ${escapeHtml(String(product.priceAmount))}`}</p><p>${escapeHtml(product.assetCount > 0 ? "Available for immediate digital delivery." : "Digital file is being prepared.")}</p><a href="${canonicalPath}">View ${escapeHtml(product.title)}</a></article></main>`;
  return {
    title: `${product.title} | ${ENV.siteName}`,
    description,
    canonicalPath,
    image: product.coverImageUrl,
    crawlableContent,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description,
      image: product.coverImageUrl ? [product.coverImageUrl] : undefined,
      category: product.category ?? product.productType ?? "Digital download",
      brand: { "@type": "Brand", name: ENV.siteName },
      offers: {
        "@type": "Offer",
        price: isFree ? "0" : String(product.priceAmount),
        priceCurrency: product.currencyCode,
        availability,
        url: absoluteUrl(`/products/${encodeURIComponent(product.handle)}`),
      },
    },
  };
}

export function injectSeoDocument(html: string, page: SeoPage) {
  const canonical = absoluteUrl(page.canonicalPath);
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const image = page.image ? escapeHtml(page.image) : "";
  const robots = page.robots ? `<meta name="robots" content="${escapeHtml(page.robots)}" />` : "";
  const socialImage = image ? `<meta property="og:image" content="${image}" /><meta name="twitter:card" content="summary_large_image" />` : `<meta name="twitter:card" content="summary" />`;
  const jsonLd = JSON.stringify(page.structuredData).replace(/</g, "\\u003c");
  const seo = `<title>${title}</title><meta name="description" content="${description}" /><link rel="canonical" href="${canonical}" /><meta property="og:type" content="website" /><meta property="og:site_name" content="${escapeHtml(ENV.siteName)}" /><meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" /><meta property="og:url" content="${canonical}" />${socialImage}${robots}<script type="application/ld+json">${jsonLd}</script>`;
  return html.replace(/<title>[\s\S]*?<\/title>/i, seo).replace("<div id=\"root\"></div>", `<div id="root">${page.crawlableContent ?? ""}</div>`);
}

export async function buildSitemapXml() {
  const db = await getDb();
  const listingRows = db ? await db.select({ handle: marketplaceListings.handle, updatedAt: marketplaceListings.updatedAt }).from(marketplaceListings).where(publishedListing) : [];
  const urls = [
    { loc: absoluteUrl("/"), lastmod: undefined },
    ...listingRows.map((listing) => ({ loc: absoluteUrl(`/products/${encodeURIComponent(listing.handle)}`), lastmod: listing.updatedAt?.toISOString() })),
  ];
  const items = urls.map(({ loc, lastmod }) => `<url><loc>${escapeHtml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

export function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /downloads\nDisallow: /api/\n\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`;
}
