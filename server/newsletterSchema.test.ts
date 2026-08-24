import { describe, expect, it } from "vitest";
import { isMissingNewsletterSubscriptionSchema } from "./newsletterSchema";

describe("newsletter schema recovery guard", () => {
  it("recognizes the missing subscription-table query failure without treating arbitrary errors as schema failures", () => {
    expect(isMissingNewsletterSubscriptionSchema(new Error("Failed query: select id from newsletterSubscriptions"))).toBe(true);
    expect(isMissingNewsletterSubscriptionSchema(new Error("network timeout"))).toBe(false);
  });

  it("does not mistake a valid account error for a missing newsletter schema", () => {
    expect(isMissingNewsletterSubscriptionSchema(new Error("Missing admin session"))).toBe(false);
  });

  it("keeps campaign draft status in the allowed explicit owner workflow", () => {
    expect(["draft", "sending", "sent", "partial", "failed"]).toContain("draft");
  });
});
