import { describe, expect, it } from "vitest";
import { GOOGLE_ANALYTICS_MEASUREMENT_ID, googleAnalyticsScriptUrl } from "./googleAnalytics";

describe("Google Analytics configuration", () => {
  it("uses the configured Ehode measurement ID in the public Google tag URL", () => {
    expect(GOOGLE_ANALYTICS_MEASUREMENT_ID).toBe("G-QMPEGNEZH6");
    expect(googleAnalyticsScriptUrl()).toBe("https://www.googletagmanager.com/gtag/js?id=G-QMPEGNEZH6");
  });
});
