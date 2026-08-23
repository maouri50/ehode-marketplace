import { describe, expect, it } from "vitest";
import { ORIGINAL_HERO_ALT, ORIGINAL_HERO_IMAGE } from "./homeHero";

describe("original homepage hero asset", () => {
  it("keeps the first verified creative-workspace asset as the homepage hero", () => {
    expect(ORIGINAL_HERO_IMAGE).toBe("/manus-storage/pink-creative-workspace_66189688.jpeg");
    expect(ORIGINAL_HERO_ALT).toContain("creative workspace");
  });
});
