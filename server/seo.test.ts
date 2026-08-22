import { describe, expect, it } from "vitest";
import { buildRobotsTxt, getSeoPage, injectSeoDocument } from "./seo";

describe("server SEO output", () => {
  it("renders canonical metadata and JSON-LD for the public storefront", async () => {
    const page = await getSeoPage("/");
    const html = injectSeoDocument("<html><head><title>Fallback</title></head><body><div id=\"root\"></div></body></html>", page);

    expect(html).toContain("https://ehode.com/");
    expect(html).toContain("application/ld+json");
    expect(html).toContain("Digital downloads for creative projects");
    expect(html).toContain('data-seo-public-content="home"');
  });

  it("keeps private buyer and admin routes out of search indexing", async () => {
    const page = await getSeoPage("/admin");
    expect(page.robots).toContain("noindex");
    expect(buildRobotsTxt()).toContain("Disallow: /admin");
    expect(buildRobotsTxt()).toContain("Sitemap: https://ehode.com/sitemap.xml");
  });
});
