import { describe, expect, it } from "vitest";
import { buildOrderReceiptEmail } from "./orderDeliveryEmail";

describe("order delivery email", () => {
  it("creates a transactional receipt message with the protected receipt URL and escaped titles", () => {
    const message = buildOrderReceiptEmail({ receiptUrl: "https://www.ehode.com/downloads/secure-token", titles: ["Planner <2026>"] });
    expect(message.subject).toBe("Your Ehode download is ready");
    expect(message.text).toContain("https://www.ehode.com/downloads/secure-token");
    expect(message.html).toContain("Planner &lt;2026&gt;");
    expect(message.html).toContain("Keep this link private");
  });
});
