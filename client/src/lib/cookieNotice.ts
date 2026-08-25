export const COOKIE_NOTICE_TEXT = "We use cookies to ensure that we give you the best experience on our website.";
export const COOKIE_NOTICE_DISMISSAL_KEY = "ehode.cookie-notice.dismissed";

export function getCookieNoticeDismissed(storage: Pick<Storage, "getItem"> | undefined): boolean {
  return storage?.getItem(COOKIE_NOTICE_DISMISSAL_KEY) === "true";
}
