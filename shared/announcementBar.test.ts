import { describe, expect, it } from "vitest";
import { announcementFontStack, nextAnnouncementIndex } from "./announcementBar";

describe("announcement bar helpers", () => {
  it("cycles through any number of messages and keeps a single message fixed", () => {
    expect(nextAnnouncementIndex(0, 4)).toBe(1);
    expect(nextAnnouncementIndex(3, 4)).toBe(0);
    expect(nextAnnouncementIndex(0, 1)).toBe(0);
    expect(nextAnnouncementIndex(0, 0)).toBe(0);
  });

  it("uses an intentional readable font stack for every owner-selectable option", () => {
    expect(announcementFontStack("sans")).toContain("Arial");
    expect(announcementFontStack("serif")).toContain("Georgia");
    expect(announcementFontStack("rounded")).toContain("Trebuchet");
    expect(announcementFontStack("mono")).toContain("monospace");
  });
});

