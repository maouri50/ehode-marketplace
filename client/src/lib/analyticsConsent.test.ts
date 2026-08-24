import { describe, expect, it } from "vitest";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  parseAnalyticsConsent,
  readAnalyticsConsent,
  saveAnalyticsConsent,
} from "./analyticsConsent";

describe("analytics consent storage", () => {
  it("accepts only explicit visitor choices", () => {
    expect(parseAnalyticsConsent("granted")).toBe("granted");
    expect(parseAnalyticsConsent("denied")).toBe("denied");
    expect(parseAnalyticsConsent("yes")).toBeUndefined();
    expect(parseAnalyticsConsent(null)).toBeUndefined();
  });

  it("persists and reads an explicit choice without defaulting to tracking", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(readAnalyticsConsent(storage)).toBeUndefined();
    saveAnalyticsConsent(storage, "denied");
    expect(values.get(ANALYTICS_CONSENT_STORAGE_KEY)).toBe("denied");
    expect(readAnalyticsConsent(storage)).toBe("denied");
  });
});
