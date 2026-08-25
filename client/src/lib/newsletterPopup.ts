export const NEWSLETTER_POPUP_STATE_KEY = "ehode.newsletter.popup";

export type NewsletterPopupState = "dismissed" | "subscribed";

export function getNewsletterPopupState(storage: Pick<Storage, "getItem"> | undefined): NewsletterPopupState | undefined {
  const value = storage?.getItem(NEWSLETTER_POPUP_STATE_KEY);
  return value === "dismissed" || value === "subscribed" ? value : undefined;
}

export function saveNewsletterPopupState(storage: Pick<Storage, "setItem"> | undefined, state: NewsletterPopupState) {
  storage?.setItem(NEWSLETTER_POPUP_STATE_KEY, state);
}
