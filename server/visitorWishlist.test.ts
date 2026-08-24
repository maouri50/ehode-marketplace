import { describe, expect, it } from "vitest";
import { parseVisitorWishlist, toggleVisitorWishlistItem, VISITOR_WISHLIST_STORAGE_KEY, writeVisitorWishlist } from "../client/src/lib/visitorWishlist";

describe("visitor wishlist", () => {
  it("keeps only unique positive listing IDs when loading browser storage", () => {
    expect(parseVisitorWishlist('[1, 1, 4, "5", -2, 3.5]')).toEqual([1, 4]);
    expect(parseVisitorWishlist("not-json")).toEqual([]);
  });

  it("toggles an item locally without any buyer account data", () => {
    expect(toggleVisitorWishlistItem([], 7)).toEqual([7]);
    expect(toggleVisitorWishlistItem([7, 9], 7)).toEqual([9]);
  });

  it("persists only normalized listing IDs under the dedicated visitor key", () => {
    const written: Record<string, string> = {};
    writeVisitorWishlist([3, 3, 8, -1], { getItem: () => null, setItem: (key, value) => { written[key] = value; } });
    expect(written[VISITOR_WISHLIST_STORAGE_KEY]).toBe("[3,8]");
  });
});
