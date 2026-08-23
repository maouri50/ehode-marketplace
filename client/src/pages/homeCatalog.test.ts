import { describe, expect, it } from "vitest";
import type { StorefrontListing } from "@/lib/storefront";
import { filterHomeCatalog } from "./homeCatalog";

const listings: StorefrontListing[] = [
  { id: 1, handle: "teacher-planner", title: "Teacher Planner", description: "A weekly classroom printable", productType: "Printable", priceAmount: "12", currencyCode: "USD", coverImageUrl: null, licenseName: null, category: "Printables", categoryHandle: "printables", assetCount: 1 },
  { id: 2, handle: "sailboat-svg", title: "Sailboat SVG", description: "A coastal cutting file", productType: "SVG", priceAmount: "4", currencyCode: "USD", coverImageUrl: null, licenseName: null, category: "SVG Design Bundles", categoryHandle: "svg-design-bundles", assetCount: 1 },
];

describe("filterHomeCatalog", () => {
  it("keeps the chosen category and search behavior intact for the redesigned home page", () => {
    expect(filterHomeCatalog(listings, "printables", "classroom")).toEqual([listings[0]]);
    expect(filterHomeCatalog(listings, "svg-design-bundles", "teacher")).toEqual([]);
  });

  it("treats an empty search as a category-only browse", () => {
    expect(filterHomeCatalog(listings, "printables", "   ")).toEqual([listings[0]]);
  });
});
