import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

describe("SEO environment settings", () => {
  it("provides an HTTPS canonical origin and site name", () => {
    const origin = ENV.canonicalOrigin;
    const siteName = ENV.siteName;

    expect(new URL(origin).protocol).toBe("https:");
    expect(siteName.trim()).toBeTruthy();
  });
});
