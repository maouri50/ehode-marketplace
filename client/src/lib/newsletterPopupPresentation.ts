export type NewsletterPopupFeedbackKind = "success" | "error";

export function getNewsletterPopupFeedbackPresentation(kind: NewsletterPopupFeedbackKind) {
  if (kind === "success") {
    return {
      className: "newsletter-popup__message newsletter-popup__message--success",
      showCheckmark: true,
    };
  }

  return {
    className: "newsletter-popup__message newsletter-popup__message--error",
    showCheckmark: false,
  };
}
