import { describe, expect, it } from "vitest";
import { sanitizeNewsletterDeliveryError, summarizeNewsletterDeliveryFailures } from "./newsletterDeliveryFailures";

describe("newsletter delivery failure summaries", () => {
  it("removes recipient addresses and provider URLs before owner display", () => {
    expect(sanitizeNewsletterDeliveryError("Mailbox user@example.com rejected https://provider.test/detail")).toBe("Mailbox [recipient] rejected [provider link]");
  });

  it("groups failure reasons by campaign without retaining recipient identity", () => {
    expect(summarizeNewsletterDeliveryFailures([
      { campaignId: 7, deliveryError: "Mailbox first@example.com rejected" },
      { campaignId: 7, deliveryError: "Mailbox second@example.com rejected" },
      { campaignId: 8, deliveryError: null },
    ])).toEqual([
      { campaignId: 7, failedCount: 2, reasons: [{ message: "Mailbox [recipient] rejected", count: 2 }] },
      { campaignId: 8, failedCount: 1, reasons: [{ message: "The email provider did not provide a delivery reason.", count: 1 }] },
    ]);
  });
});
