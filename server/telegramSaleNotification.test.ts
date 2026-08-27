import { describe, expect, it, vi } from "vitest";
import {
  formatFreeDownloadAlert,
  formatPaidDownloadAlert,
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

  it("includes only the private country code and address supplied for a verified sale", () => {
    const message = formatVerifiedSaleAlert({
      orderId: 42,
      totalAmount: 12.5,
      currencyCode: "USD",
      titles: ["Creative Planner"],
      origin: { countryCode: "MA", ipAddress: "203.0.113.24" },
    });

    expect(message).toContain("Country: MA");
    expect(message).toContain("IP address: 203.0.113.24");
    expect(message).not.toContain("email");
  });

  it("formats a free-resource alert with only the resource information", () => {
    expect(formatFreeDownloadAlert({ listingTitle: "Free Planner", filename: "planner.pdf" })).toBe(
      "Free Ehode resource downloaded\nResource: Free Planner\nFile: planner.pdf",
    );
  });

  it("formats a purchased-download alert with the private download origin", () => {
    expect(formatPaidDownloadAlert({
      listingTitle: "Creative Planner",
      filename: "planner.pdf",
      origin: { countryCode: "MA", ipAddress: "203.0.113.24" },
    })).toBe(
      "Purchased Ehode resource downloaded\nResource: Creative Planner\nFile: planner.pdf\nCountry: MA\nIP address: 203.0.113.24",
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
