import { describe, expect, it } from "vitest";
import { isMissingNewsletterSubscriptionSchema } from "./newsletterSchema";

describe("newsletter schema recovery guard", () => {
  it("recognizes the missing subscription-table query failure without treating arbitrary errors as schema failures", () => {
    expect(isMissingNewsletterSubscriptionSchema(new Error("Failed query: select id from newsletterSubscriptions"))).toBe(true);
    expect(isMissingNewsletterSubscriptionSchema(new Error("network timeout"))).toBe(false);
  });
});
