import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { productAssets } from "../drizzle/schema";
import { getDb } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { resolveBuyerEmail } from "./routers/storefront";

function anonymousContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("PayPal storefront catalog", () => {
  it("returns the imported first-party catalog without exposing purchase access", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const listings = await caller.storefront.catalog.list();

    expect(listings.length).toBeGreaterThanOrEqual(9);
    expect(listings.some((listing) => listing.handle === "apple-core-writing-templates")).toBe(true);
    expect(listings.every((listing) => typeof listing.assetCount === "number")).toBe(true);
  });

  it("accepts a null catalog input so preview and empty-filter requests return JSON", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const listings = await (caller.storefront.catalog.list as (input: null) => Promise<unknown[]>)(null);

    expect(listings.length).toBeGreaterThanOrEqual(9);
  });

  it("does not reveal download grants for a guessed receipt token", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.storefront.downloads.byReceipt({ receiptToken: "z".repeat(40) })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns only matching catalog entries for a product search and category filter", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const searched = await caller.storefront.catalog.list({ query: "sailboat" });
    const templates = await caller.storefront.catalog.list({ category: "templates" });

    expect(searched).toHaveLength(1);
    expect(searched[0]?.handle).toBe("sailboat-svg-bundle");
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((listing) => listing.categoryHandle === "templates")).toBe(true);
  });

  it("does not expose the attached paid Baby Stroller file through the free-download route", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const listings = await caller.storefront.catalog.list({ query: "baby stroller" });
    const babyStroller = listings.find((listing) => listing.handle === "baby-stroller-svg-bundle");

    expect(babyStroller?.assetCount).toBeGreaterThan(0);
    await expect(caller.storefront.catalog.freeDownload({ listingId: babyStroller!.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns the persisted attachment target for a published free listing", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const listings = await caller.storefront.catalog.list();
    const freeListing = listings.find((listing) => Number(listing.priceAmount) === 0 && Number(listing.assetCount) > 0);

    expect(freeListing).toBeDefined();
    const result = await caller.storefront.catalog.freeDownload({ listingId: freeListing!.id });
    const db = await getDb();
    const assets = await db!.select({ id: productAssets.id, filename: productAssets.originalFilename }).from(productAssets).where(eq(productAssets.listingId, freeListing!.id));
    expect(result.files).toEqual(assets.map((asset) => ({ filename: asset.filename, url: `/api/download/free/${freeListing!.id}/${asset.id}` })));
  });

  it("rejects a paid checkout without a valid buyer email before creating a PayPal order", async () => {
    const caller = appRouter.createCaller(anonymousContext());

    await expect(caller.storefront.paypal.createOrder({
      items: [{ listingId: 5, quantity: 1 }],
      buyerEmail: "not-an-email",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("uses the verified PayPal payer email only when checkout email is absent during capture", () => {
    expect(resolveBuyerEmail("buyer@example.com", "payer@example.com")).toBe("buyer@example.com");
    expect(resolveBuyerEmail(undefined, "Payer@Example.com ")).toBe("payer@example.com");
    expect(resolveBuyerEmail(null, undefined)).toBeNull();
  });
});
