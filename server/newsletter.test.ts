import { describe, expect, it } from "vitest";
import { NEWSLETTER_SUCCESS_MESSAGE, normalizeNewsletterEmail, subscribeNewsletter } from "./newsletter";

describe("newsletter subscription helpers", () => {
  it("normalizes a subscriber email before private storage", () => {
    expect(normalizeNewsletterEmail("  HELLO@EXAMPLE.COM ")).toBe("hello@example.com");
  });

  it("uses one generic success response for new and duplicate subscribers", () => {
    expect(NEWSLETTER_SUCCESS_MESSAGE).toBe("You are on the list. Watch your inbox for future Ehode news.");
  });

  it("requests a confirmation only for a new subscription", async () => {
    const created: string[] = [];
    const activeStore = { findByEmail: async () => null, create: async (email: string) => { created.push(email); }, reactivate: async () => {} };
    await expect(subscribeNewsletter(activeStore, "  HELLO@EXAMPLE.COM ")).resolves.toEqual({ success: true, message: NEWSLETTER_SUCCESS_MESSAGE, confirmationRequired: true });
    expect(created).toEqual(["hello@example.com"]);

    const duplicateStore = { findByEmail: async () => ({ id: 7, status: "active" as const }), create: async () => { throw new Error("duplicate must not insert"); }, reactivate: async () => { throw new Error("active subscriber must not reactivate"); } };
    await expect(subscribeNewsletter(duplicateStore, "hello@example.com")).resolves.toEqual({ success: true, message: NEWSLETTER_SUCCESS_MESSAGE, confirmationRequired: false });
  });

  it("requests a new confirmation after a previously unsubscribed visitor gives fresh consent", async () => {
    const reactivated: number[] = [];
    const store = { findByEmail: async () => ({ id: 12, status: "unsubscribed" as const }), create: async () => { throw new Error("resubscribe must not insert"); }, reactivate: async (id: number) => { reactivated.push(id); } };
    await expect(subscribeNewsletter(store, "returning@example.com")).resolves.toEqual({ success: true, message: NEWSLETTER_SUCCESS_MESSAGE, confirmationRequired: true });
    expect(reactivated).toEqual([12]);
  });
});
