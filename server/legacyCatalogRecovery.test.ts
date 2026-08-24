import { describe, expect, it } from "vitest";
import { legacyCatalogListings, legacyPlaceholderHandles, needsLegacyCatalogRecovery } from "./legacyCatalogRecovery";

describe("legacy catalog recovery", () => {
  it("contains the nine verified historic product records with unique public handles", () => {
    expect(legacyCatalogListings).toHaveLength(9);
    expect(new Set(legacyCatalogListings.map((listing) => listing.handle)).size).toBe(9);
    expect(legacyCatalogListings.every((listing) => listing.coverImageUrl.startsWith("https://zfkzhiygaxqre7th.public.blob.vercel-storage.com/"))).toBe(true);
  });

  it("runs until every verified legacy listing is present, making partial recoveries safe to retry", () => {
    expect(needsLegacyCatalogRecovery([])).toBe(true);
    expect(needsLegacyCatalogRecovery([legacyCatalogListings[0]!.handle])).toBe(true);
    expect(needsLegacyCatalogRecovery(legacyCatalogListings.map((listing) => listing.handle))).toBe(false);
  });

  it("limits placeholder archiving to the known mismatched Production records", () => {
    expect(legacyPlaceholderHandles).toEqual(["ddd-ukrpbh", "ddddd-8e3w_k", "dffhhdf-zl_k3u", "fdxhfgchf-u8otk5"]);
  });
});
