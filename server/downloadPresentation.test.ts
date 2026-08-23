import { describe, expect, it } from "vitest";
import { downloadCountLabel, formatDownloadFileType } from "../client/src/lib/downloadPresentation";

describe("download receipt presentation", () => {
  it("creates clear file-type and protected-file labels", () => {
    expect(formatDownloadFileType("planner.pdf")).toBe("PDF FILE");
    expect(formatDownloadFileType("asset")).toBe("DIGITAL FILE");
    expect(downloadCountLabel(1)).toBe("1 protected file");
    expect(downloadCountLabel(2)).toBe("2 protected files");
  });
});
