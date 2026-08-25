export const COOKIE_NOTICE_TEXT = "We use cookies to ensure that we give you the best experience on our website.";
export const COOKIE_ANALYTICS_CHOICE_KEY = "ehode.analytics.choice";
export type CookieAnalyticsChoice = "accepted" | "declined";

export function getCookieAnalyticsChoice(storage: Pick<Storage, "getItem"> | undefined): CookieAnalyticsChoice | undefined {
  const value = storage?.getItem(COOKIE_ANALYTICS_CHOICE_KEY);
  return value === "accepted" || value === "declined" ? value : undefined;
}
