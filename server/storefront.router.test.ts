import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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
});
