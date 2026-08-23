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
  const firstPaintStyles = `<style data-seo-first-paint>
    #root > main[data-seo-public-content] { box-sizing:border-box; min-height:100vh; padding:clamp(24px,5vw,72px); background:#fffdf9; color:#2f2823; font-family:Arial,Helvetica,sans-serif; }
    main[data-seo-public-content] * { box-sizing:border-box; }
    main[data-seo-public-content] a { color:inherit; }
    main[data-seo-public-content="home"] > header { max-width:1180px; margin:0 auto; padding:clamp(28px,5vw,68px); border:1px solid #eadfd3; border-radius:18px; background:linear-gradient(135deg,#fff8ef 0%,#f4dfc6 100%); }
    main[data-seo-public-content="home"] header > p:first-child { margin:0 0 12px; color:#a45726; font-size:12px; font-weight:800; letter-spacing:.11em; text-transform:uppercase; }
    main[data-seo-public-content="home"] h1 { max-width:680px; margin:0; font-family:Georgia,'Times New Roman',serif; font-size:clamp(36px,5vw,68px); line-height:.98; }
    main[data-seo-public-content="home"] header > p:last-child { max-width:560px; margin:20px 0 0; color:#655b52; font-size:17px; line-height:1.55; }
    main[data-seo-public-content] section { max-width:1180px; margin:52px auto 0; }
    main[data-seo-public-content] h2 { margin:0 0 26px; font-family:Georgia,'Times New Roman',serif; font-size:clamp(28px,3vw,42px); }
    main[data-seo-public-content] ul { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; margin:0; padding:0; list-style:none; }
    main[data-seo-public-content] li { min-height:178px; padding:22px; border:1px solid #eadfd3; border-radius:12px; background:#fff; box-shadow:0 8px 20px rgba(68,47,29,.06); }
    main[data-seo-public-content] li a { display:block; font-family:Georgia,'Times New Roman',serif; font-size:18px; font-weight:700; line-height:1.18; text-decoration:none; }
    main[data-seo-public-content] li p { margin:12px 0 0; color:#71665b; font-size:13px; line-height:1.45; }
    main[data-seo-public-content] li p:last-child { color:#a45726; font-size:14px; font-weight:800; }
    main[data-seo-public-content="product"] { max-width:920px; margin:0 auto; padding-top:clamp(48px,9vw,120px); }
    main[data-seo-public-content="product"] nav { margin-bottom:30px; color:#8b6a51; font-size:14px; }
    main[data-seo-public-content="product"] article { padding:clamp(28px,5vw,64px); border:1px solid #eadfd3; border-radius:18px; background:#fff8ef; }
    main[data-seo-public-content="product"] article p { max-width:650px; color:#655b52; font-size:16px; line-height:1.55; }
    main[data-seo-public-content="product"] article a { display:inline-block; margin-top:12px; padding:13px 18px; border-radius:999px; background:#b65320; color:#fff; font-weight:800; text-decoration:none; }
    @media (max-width:760px) { #root > main[data-seo-public-content] { padding:18px; } main[data-seo-public-content="home"] > header { padding:30px 24px; border-radius:14px; } main[data-seo-public-content] section { margin-top:34px; } main[data-seo-public-content] ul { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; } main[data-seo-public-content] li { min-height:150px; padding:14px; } main[data-seo-public-content] li a { font-size:15px; } main[data-seo-public-content] li p { font-size:12px; } }
  </style>`;
  return html.replace(/<title>[\s\S]*?<\/title>/i, seo).replace("</head>", `${firstPaintStyles}</head>`).replace("<div id=\"root\"></div>", `<div id="root">${page.crawlableContent ?? ""}</div>`);
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
