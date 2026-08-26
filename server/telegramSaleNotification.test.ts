import { describe, expect, it, vi } from "vitest";
import {
  formatFreeDownloadAlert,
  formatVerifiedSaleAlert,
  sendTelegramOwnerNotification,
} from "./telegramSaleNotification";

describe("Telegram sale notifications", () => {
  it("formats a verified sale without including buyer contact information", () => {
    const message = formatVerifiedSaleAlert({
      orderId: 42,
      totalAmount: 12.5,
      currencyCode: "USD",
      titles: ["Creative Planner", "SVG Bundle"],
    });

    expect(message).toContain("New Ehode sale");
    expect(message).toContain("Order #42");
    expect(message).toContain("12.50 USD");
    expect(message).not.toContain("@");
  });

  it("formats a free-resource alert with only the resource information", () => {
    expect(formatFreeDownloadAlert({ listingTitle: "Free Planner", filename: "planner.pdf" })).toBe(
      "Free Ehode resource downloaded\nResource: Free Planner\nFile: planner.pdf",
    );
  });

  it("sends the owner-only message through the configured Telegram endpoint", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(sendTelegramOwnerNotification("New Ehode sale", { fetch: request, botToken: "token", chatId: "123" })).resolves.toEqual({ sent: true });
    expect(request).toHaveBeenCalledWith(
      "https://api.telegram.org/bottoken/sendMessage",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("never treats missing credentials as a successful send", async () => {
    await expect(sendTelegramOwnerNotification("New Ehode sale", { botToken: "", chatId: "" })).resolves.toEqual({ sent: false, reason: "not_configured" });
  });
});
