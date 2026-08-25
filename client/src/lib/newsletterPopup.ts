export const NEWSLETTER_POPUP_STATE_KEY = "ehode.newsletter.popup";
export const NEWSLETTER_POPUP_DISMISSED_AT_KEY = "ehode.newsletter.popup.dismissed-at";
export const NEWSLETTER_POPUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type NewsletterPopupState = "dismissed" | "subscribed";
type PopupStorage = Pick<Storage, "getItem" | "setItem"> | undefined;

export function getNewsletterPopupState(storage: Pick<Storage, "getItem"> | undefined): NewsletterPopupState | undefined {
  const value = storage?.getItem(NEWSLETTER_POPUP_STATE_KEY);
  return value === "dismissed" || value === "subscribed" ? value : undefined;
}

export function saveNewsletterPopupState(storage: Pick<Storage, "setItem"> | undefined, state: NewsletterPopupState) {
  storage?.setItem(NEWSLETTER_POPUP_STATE_KEY, state);
}

export function saveNewsletterPopupDismissal(storage: PopupStorage, dismissedAt = Date.now()) {
  saveNewsletterPopupState(storage, "dismissed");
  storage?.setItem(NEWSLETTER_POPUP_DISMISSED_AT_KEY, String(dismissedAt));
}

/** Shows again after one day for dismissed visitors, but never for a successful subscriber on that device. */
export function shouldShowNewsletterPopup(storage: Pick<Storage, "getItem"> | undefined, now = Date.now()) {
  const state = getNewsletterPopupState(storage);
  if (state === "subscribed") return false;
  if (state !== "dismissed") return true;
  const dismissedAt = Number(storage?.getItem(NEWSLETTER_POPUP_DISMISSED_AT_KEY));
  return !Number.isFinite(dismissedAt) || now - dismissedAt >= NEWSLETTER_POPUP_INTERVAL_MS;
}
