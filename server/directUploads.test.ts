import { describe, expect, it } from "vitest";
import { createUploadPath } from "./directUploads";

describe("direct Vercel Blob upload paths", () => {
  it("keeps resource files scoped to their product and normalizes unsafe filename characters", () => {
    const path = createUploadPath(42, "file", "my resource (final).pdf");
    expect(path).toMatch(/^product-files\/42\/[0-9a-f-]+-my-resource-final\.pdf$/);
  });

  it("uses the private cover namespace for product images", () => {
    const path = createUploadPath(7, "cover", "cover image.webp");
    expect(path).toMatch(/^product-covers\/7\/[0-9a-f-]+-cover-image\.webp$/);
  });
});
