import { describe, expect, it } from "vitest";
import { buildNewsletterCampaignEmail, createNewsletterCampaignDraft, newsletterCampaignSendConfirmation, selectActiveCampaignRecipients, sendNewsletterCampaignNow, summarizeCampaignDelivery, type NewsletterCampaignStore } from "./newsletterCampaign";

function campaignStore() {
  const events: string[] = [];
  const recipients: Array<{ email: string; status: string }> = [];
  const storedSubscribers = [
    { id: 1, email: "active@example.com", unsubscribeToken: "known-token", status: "active" as const },
    { id: 9, email: "unsubscribed@example.com", unsubscribeToken: "skip-token", status: "unsubscribed" as const },
    { id: 2, email: "second@example.com", unsubscribeToken: null, status: "active" as const },
  ];
  const store: NewsletterCampaignStore = {
    countActiveSubscribers: async () => selectActiveCampaignRecipients(storedSubscribers).length,
    createDraft: async (input) => { events.push(`draft:${input.templateType}:${input.products.length}:${input.recipientCount}`); return 41; },
    claimDraft: async () => { events.push("claim"); return true; },
    getCampaign: async () => ({ subject: "Ehode update", body: "New resources are ready.", templateType: "manual", seasonLabel: null, products: [] }),
    activeSubscribers: async () => selectActiveCampaignRecipients(storedSubscribers),
    setUnsubscribeToken: async (id) => { events.push(`token:${id}`); },
    recordRecipient: async (recipient) => { recipients.push({ email: recipient.email, status: recipient.status }); },
    completeCampaign: async (result) => { events.push(`complete:${result.status}:${result.recipientCount}`); },
  };
  return { store, events, recipients };
}

describe("newsletter campaigns", () => {
  it("renders subscriber text safely with a private unsubscribe link", () => {
    const message = buildNewsletterCampaignEmail({ body: "New <idea>\nfor you", unsubscribeUrl: "https://ehode.com/newsletter/unsubscribe/private-token" });
    expect(message.html).toContain("New &lt;idea&gt;<br/>for you");
    expect(message.html).toContain("newsletter/unsubscribe/private-token");
    expect(message.text).toContain("Unsubscribe:");
  });

  it("distinguishes complete, partial, and failed delivery summaries", () => {
    expect(summarizeCampaignDelivery({ sent: 2, failed: 0 })).toBe("sent");
    expect(summarizeCampaignDelivery({ sent: 2, failed: 1 })).toBe("partial");
    expect(summarizeCampaignDelivery({ sent: 0, failed: 2 })).toBe("failed");
  });

  it("requires the exact explicit SEND confirmation before campaign delivery", () => {
    expect(newsletterCampaignSendConfirmation.safeParse("SEND").success).toBe(true);
    expect(newsletterCampaignSendConfirmation.safeParse("send").success).toBe(false);
    expect(newsletterCampaignSendConfirmation.safeParse("").success).toBe(false);
  });

  it("creates a draft without calling a mailer and records only the active recipient count", async () => {
    const { store, events } = campaignStore();
    await expect(createNewsletterCampaignDraft(store, { subject: "New ideas", body: "A message for subscribers.", templateType: "manual", seasonLabel: null, products: [] })).resolves.toEqual({ id: 41, recipientCount: 2 });
    expect(events).toEqual(["draft:manual:0:2"]);
  });

  it("allows a zero-subscriber draft while keeping delivery unavailable", async () => {
    const { store, events } = campaignStore();
    store.countActiveSubscribers = async () => 0;
    await expect(createNewsletterCampaignDraft(store, { subject: "Future update", body: "This can be written before signups arrive.", templateType: "manual", seasonLabel: null, products: [] })).resolves.toEqual({ id: 41, recipientCount: 0 });
    expect(events).toEqual(["draft:manual:0:0"]);
  });

  it("stores selected real-product snapshots with a draft but never calls a mailer while saving", async () => {
    const { store, events } = campaignStore();
    await expect(createNewsletterCampaignDraft(store, { subject: "New resources", body: "See these resources.", templateType: "selected", seasonLabel: null, products: [{ listingId: 4, handle: "lesson-planner", title: "Lesson Planner", priceAmount: "9.00", currencyCode: "USD", coverImageUrl: "/api/cover/4", sortOrder: 0 }] })).resolves.toEqual({ id: 41, recipientCount: 2 });
    expect(events).toEqual(["draft:selected:1:2"]);
  });

  it("filters mixed subscriber records to opted-in recipients before delivery", async () => {
    const selected = selectActiveCampaignRecipients([
      { id: 1, email: "active@example.com", unsubscribeToken: "a", status: "active" },
      { id: 2, email: "unsubscribed@example.com", unsubscribeToken: "b", status: "unsubscribed" },
      { id: 3, email: "second@example.com", unsubscribeToken: null, status: "active" },
    ]);
    expect(selected.map((subscriber) => subscriber.email)).toEqual(["active@example.com", "second@example.com"]);
  });

  it("only delivers after exact SEND confirmation, targets active records, and persists delivery results", async () => {
    const { store, events, recipients } = campaignStore();
    const sentTo: string[] = [];
    const mailer = { send: async ({ to }: { to: string }) => { sentTo.push(to); return { id: `mail-${sentTo.length}` }; } };
    await expect(sendNewsletterCampaignNow({ campaignId: 41, confirmation: "send", canonicalOrigin: "https://ehode.com", store, mailer, makeToken: () => "new-token" })).rejects.toThrow("exact SEND");
    expect(sentTo).toEqual([]);
    await expect(sendNewsletterCampaignNow({ campaignId: 41, confirmation: "SEND", canonicalOrigin: "https://ehode.com", store, mailer, makeToken: () => "new-token" })).resolves.toMatchObject({ status: "sent", sent: 2, failed: 0 });
    expect(sentTo).toEqual(["active@example.com", "second@example.com"]);
    expect(sentTo).not.toContain("unsubscribed@example.com");
    expect(events).toContain("token:2");
    expect(events).toContain("complete:sent:2");
    expect(recipients).toEqual([{ email: "active@example.com", status: "sent" }, { email: "second@example.com", status: "sent" }]);
  });

  it("keeps a zero-subscriber draft unsent even with a SEND confirmation", async () => {
    const { store, events } = campaignStore();
    store.activeSubscribers = async () => [];
    const mailer = { send: async () => ({ id: "should-not-send" }) };
    await expect(sendNewsletterCampaignNow({ campaignId: 41, confirmation: "SEND", canonicalOrigin: "https://ehode.com", store, mailer, makeToken: () => "new-token" })).rejects.toThrow("There are no active newsletter subscribers");
    expect(events).not.toContain("claim");
  });
});
