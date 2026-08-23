import { describe, expect, it } from "vitest";
import { readingProgress, uploadProgressLabel } from "../client/src/lib/adminUploadProgress";

describe("admin upload progress", () => {
  it("keeps file-reading progress within the preparation range", () => {
    expect(readingProgress(0, 100)).toBe(5);
    expect(readingProgress(50, 100)).toBe(30);
    expect(readingProgress(100, 100)).toBe(60);
  });

  it("labels uploaded files and covers clearly", () => {
    expect(uploadProgressLabel({ listingId: 1, kind: "file", filename: "guide.pdf", stage: "success", progress: 100 })).toBe("File attached · 100%");
    expect(uploadProgressLabel({ listingId: 1, kind: "cover", filename: "cover.png", stage: "uploading", progress: 75 })).toBe("Uploading securely · 75%");
  });
});
