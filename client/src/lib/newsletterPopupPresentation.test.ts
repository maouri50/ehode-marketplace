import { describe, expect, it } from "vitest";
import { getNewsletterPopupFeedbackPresentation } from "./newsletterPopupPresentation";

describe("newsletter popup feedback presentation", () => {
  it("uses a prominent checkmark treatment only for successful subscriptions", () => {
    expect(getNewsletterPopupFeedbackPresentation("success")).toEqual({
      className: "newsletter-popup__message newsletter-popup__message--success",
      showCheckmark: true,
    });
  });

  it("keeps errors distinct and does not decorate them with a success icon", () => {
    expect(getNewsletterPopupFeedbackPresentation("error")).toEqual({
      className: "newsletter-popup__message newsletter-popup__message--error",
      showCheckmark: false,
    });
  });
});
