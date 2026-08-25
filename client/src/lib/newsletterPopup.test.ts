import { describe, expect, it } from "vitest";
import { NEWSLETTER_POPUP_DISMISSED_AT_KEY, NEWSLETTER_POPUP_INTERVAL_MS, NEWSLETTER_POPUP_STATE_KEY, saveNewsletterPopupDismissal, shouldShowNewsletterPopup } from "./newsletterPopup";

function memoryStorage(values: Record<string, string> = {}) {
  return {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => { values[key] = value; },
    values,
  };
}

describe("newsletter popup schedule", () => {
  it("does not repeat for a dismissed visitor until one day has passed", () => {
    const storage = memoryStorage();
    saveNewsletterPopupDismissal(storage, 10_000);
    expect(storage.values).toMatchObject({ [NEWSLETTER_POPUP_STATE_KEY]: "dismissed", [NEWSLETTER_POPUP_DISMISSED_AT_KEY]: "10000" });
    expect(shouldShowNewsletterPopup(storage, 10_000 + NEWSLETTER_POPUP_INTERVAL_MS - 1)).toBe(false);
    expect(shouldShowNewsletterPopup(storage, 10_000 + NEWSLETTER_POPUP_INTERVAL_MS)).toBe(true);
  });

  it("never repeats for a subscriber on the same device", () => {
    const storage = memoryStorage({ [NEWSLETTER_POPUP_STATE_KEY]: "subscribed" });
    expect(shouldShowNewsletterPopup(storage, Date.now() + NEWSLETTER_POPUP_INTERVAL_MS * 10)).toBe(false);
  });
});
