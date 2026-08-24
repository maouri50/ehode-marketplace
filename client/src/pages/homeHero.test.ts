import { describe, expect, it } from "vitest";
import { ORIGINAL_HERO_ALT, ORIGINAL_HERO_IMAGE } from "./homeHero";

describe("original homepage hero asset", () => {
  it("uses the verified stylish creative hero asset", () => {
    expect(ORIGINAL_HERO_IMAGE).toBe("/manus-storage/ehode-stylish-creative-hero_6f28424a.jpg");
    expect(ORIGINAL_HERO_ALT).toContain("creative desk");
  });
});
