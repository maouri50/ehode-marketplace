import { describe, expect, it } from "vitest";
import { getNewsletterPopupState, NEWSLETTER_POPUP_STATE_KEY, saveNewsletterPopupState } from "./newsletterPopup";

describe("newsletter popup state", () => {
  it("accepts only the recognized dismissal and subscription states", () => {
    expect(getNewsletterPopupState({ getItem: () => "dismissed" })).toBe("dismissed");
    expect(getNewsletterPopupState({ getItem: () => "subscribed" })).toBe("subscribed");
    expect(getNewsletterPopupState({ getItem: () => "other" })).toBeUndefined();
  });

  it("stores the visitor decision under a single private browser key", () => {
    const writes: Array<[string, string]> = [];
    saveNewsletterPopupState({ setItem: (key, value) => writes.push([key, value]) }, "dismissed");
    expect(writes).toEqual([[NEWSLETTER_POPUP_STATE_KEY, "dismissed"]]);
  });
});
