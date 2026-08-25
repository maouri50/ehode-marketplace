import { describe, expect, it } from "vitest";
import { createNewsletterSubscriptionConfirmationMessage } from "./newsletterConfirmationEmail";

describe("newsletter subscription confirmation", () => {
  it("creates a clear confirmation without exposing server configuration", () => {
    const message = createNewsletterSubscriptionConfirmationMessage("  VISITOR@example.com ");
    expect(message.subject).toContain("subscribed");
    expect(message.text).toContain("visitor@example.com");
    expect(message.text).toContain("unsubscribe");
    expect(message.html).toContain("visitor@example.com");
  });
});
