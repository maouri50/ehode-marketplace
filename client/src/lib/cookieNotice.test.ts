import { describe, expect, it } from "vitest";
import { COOKIE_ANALYTICS_CHOICE_KEY, COOKIE_NOTICE_TEXT, getCookieAnalyticsChoice } from "./cookieNotice";

describe("informational cookie notice", () => {
  it("uses the owner-requested wording and remembers an explicit analytics choice", () => {
    expect(COOKIE_NOTICE_TEXT).toBe("We use cookies to ensure that we give you the best experience on our website.");
    expect(getCookieAnalyticsChoice({ getItem: (key) => key === COOKIE_ANALYTICS_CHOICE_KEY ? "accepted" : null })).toBe("accepted");
    expect(getCookieAnalyticsChoice({ getItem: () => "declined" })).toBe("declined");
    expect(getCookieAnalyticsChoice({ getItem: () => null })).toBeUndefined();
  });
});
