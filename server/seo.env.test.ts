import { describe, expect, it } from "vitest";

describe("SEO environment settings", () => {
  it("provides an HTTPS canonical origin and site name", () => {
    const origin = process.env.CANONICAL_ORIGIN ?? "";
    const siteName = process.env.SITE_NAME ?? "";

    expect(new URL(origin).protocol).toBe("https:");
    expect(siteName.trim()).toBeTruthy();
  });
});
