import { describe, expect, it } from "vitest";
import { COOKIE_NOTICE_DISMISSAL_KEY, COOKIE_NOTICE_TEXT, getCookieNoticeDismissed } from "./cookieNotice";

describe("informational cookie notice", () => {
  it("uses the owner-requested wording without making analytics consent conditional", () => {
    expect(COOKIE_NOTICE_TEXT).toBe("We use cookies to ensure that we give you the best experience on our website.");
    expect(getCookieNoticeDismissed({ getItem: (key) => key === COOKIE_NOTICE_DISMISSAL_KEY ? "true" : null })).toBe(true);
    expect(getCookieNoticeDismissed({ getItem: () => null })).toBe(false);
  });
});
