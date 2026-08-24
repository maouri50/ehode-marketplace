import { eq, inArray } from "drizzle-orm";
import { catalogCategories, marketplaceListings, sellers, shops } from "../drizzle/schema";

type LegacyCategory = { name: string; handle: string; description: string; sortOrder: number };
type LegacyListing = {
  externalProductId: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  priceAmount: string;
  currencyCode: string;
  coverImageUrl: string;
  featured: number;
  categoryHandle: string;
};

export const legacyCatalogCategories: LegacyCategory[] = [
  { name: "Printable Templates", handle: "templates", description: "Printable writing and classroom templates.", sortOrder: 1 },
  { name: "SVG Design Bundles", handle: "svg-bundles", description: "SVG, PNG, PDF, and DXF design resources.", sortOrder: 2 },
];

/** Historic listings recovered from the verified Vercel-backed test catalog. These are product records, not generated content. */
export const legacyCatalogListings: LegacyListing[] = [
  { externalProductId: "1780691689054", handle: "apple-core-writing-templates", title: "Apple Core Writing Templates | 4 Printable Writing Pages", description: "Make writing fun with four apple-core themed printable writing pages for storytelling, journaling, reflections, and classroom activities.", productType: "Template", priceAmount: "2.00", currencyCode: "USD", coverImageUrl: "https://zfkzhiygaxqre7th.public.blob.vercel-storage.com/uploads/1780691677350_1000012575-19JnM9YbwAsYrFdYAf6j9Hrd0YhH4p.png", featured: 1, categoryHandle: "templates" },
  { externalProductId: "1780705592795", handle: "igloo-writing-paper-templates", title: "Igloo Writing Paper Templates – Winter Writing Activity", description: "Bring winter creativity into the classroom with a practical printable writing resource.", productType: "Template", priceAmount: "2.00", currencyCode: "USD", coverImageUrl: "https://zfkzhiygaxqre7th.public.blob.vercel-storage.com/uploads/1780705544876_1000012664-meN217zeRvlOxzWuK1SkUuP4fMwYwn.png", featured: 0, categoryHandle: "templates" },
  { externalProductId: "1780711289496", handle: "apron-shaped-writing-templates", title: "Apron Shaped Writing Templates | Printable Writing Pages", description: "Creative apron-shaped printable writing pages for classroom activities, literacy centers, and creative writing projects.", productType: "Template", priceAmount: "2.00", currencyCode: "USD", coverImageUrl: "https://zfkzhiygaxqre7th.public.blob.vercel-storage.com/uploads/1780711255396_1000012692-Tw7wKLAgeeYmwg02FmN0dIBdrdi53z.png", featured: 0, categoryHandle: "templates" },
  { externalProductId: "1780881770024", handle: "drone-icon-set", title: "Drone Icon Set – 9 High Quality Drone Silhouettes SVG PNG PDF DXF", description: "A digital icon bundle featuring nine drone designs for creative projects.", productType: "SVG Bundle", priceAmount: "2.00", currencyCode: "USD", coverImageUrl: "https://zfkzhiygaxqre7th.public.blob.vercel-storage.com/uploads/1780881693939_1000012872-i1UwRlgy0owiV9tYgchg0TvNxtDdVW.png", featured: 0, categoryHandle: "svg-bundles" },
  { externalProductId: "1780882995839", handle: "baby-stroller-svg-bundle", title: "Baby Stroller SVG Bundle | 9 Vintage Pram Designs PNG SVG PDF DXF", description: "A digital bundle of nine stroller designs for baby-themed creative projects.", productType: "SVG Bundle", priceAmount: "2.00", currencyCode: "USD", coverImageUrl: "https://zfkzhiygaxqre7th.public.blob.vercel-storage.com/uploads/1780883173344_1000012876-wWWxK1n0V0vmCi0jhtFYgWJorThIcI.png", featured: 0, categoryHandle: "svg-bundles" },
  { externalProductId: "1780961549287", handle: "anchor-icon-bundle", title: "Anchor Icon Bundle – 12 Nautical SVG PNG JPG PDF DXF Designs", description: "A nautical icon bundle featuring twelve anchor designs for creative projects.", productType: "SVG Bundle", priceAmount: "2.50", currencyCode: "USD", coverImageUrl: "https://zfkzhiygaxqre7th.public.blob.vercel-storage.com/uploads/1780962042012_1000012936-iPOFkD4CQP9hsPN9haSxVwPvENth87.png", featured: 0, categoryHandle: "svg-bundles" },
  { externalProductId: "1780965287800", handle: "flower-vase-svg-bundle", title: "Flower Vase SVG Bundle | Printable Floral Designs PNG DXF PDF", description: "Digital flower vase designs for cutting machines, home décor, cards, and scrapbooking.", productType: "SVG Bundle", priceAmount: "2.30", currencyCode: "USD", coverImageUrl: "https://zfkzhiygaxqre7th.public.blob.vercel-storage.com/uploads/1781008918745_1000012997-XGPRNMstpGKm2LULqgoVZihQJfFI63.png", featured: 0, categoryHandle: "svg-bundles" },
  { externalProductId: "1780965465362", handle: "basketball-svg-bundle", title: "Basketball SVG Bundle | Sports Icon Designs PNG DXF PDF", description: "Digital basketball designs for creative machine-cutting and sports projects.", productType: "SVG Bundle", priceAmount: "3.00", currencyCode: "USD", coverImageUrl: "https://zfkzhiygaxqre7th.public.blob.vercel-storage.com/uploads/1781013570841_1000012998-uLg79qhqWq1vyoRiu5KPRD4RAQoiPp.png", featured: 0, categoryHandle: "svg-bundles" },
  { externalProductId: "1780965768988", handle: "sailboat-svg-bundle", title: "Sailboat SVG Bundle | Nautical Boat Designs PNG DXF PDF", description: "Digital sailboat designs for coastal décor, invitations, and creative projects.", productType: "SVG Bundle", priceAmount: "2.00", currencyCode: "USD", coverImageUrl: "https://zfkzhiygaxqre7th.public.blob.vercel-storage.com/uploads/1781013747902_1000012999-5D7eYSP4GgeLh4LYtvdoJUYgOLc0Oj.png", featured: 0, categoryHandle: "svg-bundles" },
];

/** Known placeholder records from the mismatched Production catalog. No other production listings are changed. */
export const legacyPlaceholderHandles = ["ddd-ukrpbh", "ddddd-8e3w_k", "dffhhdf-zl_k3u", "fdxhfgchf-u8otk5"];

export function needsLegacyCatalogRecovery(existingHandles: readonly string[]) {
  const known = new Set(existingHandles);
  return legacyCatalogListings.some((listing) => !known.has(listing.handle));
}

export async function ensureLegacyCatalogRecovery(db: any) {
  const expectedHandles = legacyCatalogListings.map((listing) => listing.handle);
  const present = await db.select({ handle: marketplaceListings.handle }).from(marketplaceListings).where(inArray(marketplaceListings.handle, expectedHandles));
  if (!needsLegacyCatalogRecovery(present.map((listing: { handle: string }) => listing.handle))) return false;

  for (const category of legacyCatalogCategories) {
    await db.insert(catalogCategories).values(category).onDuplicateKeyUpdate({ set: { name: category.name, description: category.description, sortOrder: category.sortOrder, isActive: 1 } });
  }
  const categoryRows = await db.select({ id: catalogCategories.id, handle: catalogCategories.handle }).from(catalogCategories).where(inArray(catalogCategories.handle, legacyCatalogCategories.map((category) => category.handle)));
  const categoryIds = new Map(categoryRows.map((category: { id: number; handle: string }) => [category.handle, category.id]));

  let shop = (await db.select({ id: shops.id }).from(shops).where(eq(shops.handle, "ehode")).limit(1))[0];
  if (!shop) {
    let seller = (await db.select({ id: sellers.id }).from(sellers).where(eq(sellers.displayName, "Ehode Studio")).limit(1))[0];
    if (!seller) {
      await db.insert(sellers).values({ displayName: "Ehode Studio", status: "active" });
      seller = (await db.select({ id: sellers.id }).from(sellers).where(eq(sellers.displayName, "Ehode Studio")).limit(1))[0];
    }
    await db.insert(shops).values({ sellerId: seller.id, name: "Ehode Studio", handle: "ehode", description: "Independent digital resources for creative work and learning.", status: "active" }).onDuplicateKeyUpdate({ set: { name: "Ehode Studio", description: "Independent digital resources for creative work and learning.", status: "active" } });
    shop = (await db.select({ id: shops.id }).from(shops).where(eq(shops.handle, "ehode")).limit(1))[0];
  }

  for (const listing of legacyCatalogListings) {
    const categoryId = categoryIds.get(listing.categoryHandle);
    if (!categoryId) throw new Error(`Missing recovery category ${listing.categoryHandle}`);
    const values = { shopId: shop.id, categoryId, externalProductId: listing.externalProductId, handle: listing.handle, title: listing.title, description: listing.description, productType: listing.productType, priceAmount: listing.priceAmount, currencyCode: listing.currencyCode, coverImageUrl: listing.coverImageUrl, licenseName: null, featured: listing.featured, status: "published" as const, isDigital: 1 };
    await db.insert(marketplaceListings).values(values).onDuplicateKeyUpdate({ set: { categoryId, title: listing.title, description: listing.description, productType: listing.productType, priceAmount: listing.priceAmount, currencyCode: listing.currencyCode, coverImageUrl: listing.coverImageUrl, licenseName: null, featured: listing.featured, status: "published", isDigital: 1 } });
  }

  await db.update(marketplaceListings).set({ status: "archived" }).where(inArray(marketplaceListings.handle, legacyPlaceholderHandles));
  return true;
}
