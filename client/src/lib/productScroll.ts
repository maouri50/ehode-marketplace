/**
 * Product pages must start at their hero, even when a visitor opens one after
 * browsing farther down the collection page.
 */
export const PRODUCT_PAGE_START_POSITION: ScrollToOptions = {
  top: 0,
  left: 0,
  // "instant" bypasses the storefront's global smooth-scroll setting.
  behavior: "instant" as ScrollBehavior,
};

export function scrollProductPageToStart() {
  if (typeof window === "undefined") return;

  window.scrollTo(PRODUCT_PAGE_START_POSITION);
}
