import { afterEach, describe, expect, it } from "vitest";
import { count, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { newsletterCampaignRecipients, newsletterCampaigns, newsletterSubscriptions } from "../drizzle/schema";
import { createAdminSessionToken, ADMIN_SESSION_COOKIE } from "./adminAuth";
import { getDb } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createNewsletterCampaignDatabaseStore } from "./newsletterCampaignDatabase";
import { sendNewsletterCampaignNow } from "./newsletterCampaign";

const campaignIds: number[] = [];
const subscriptionIds: number[] = [];

function adminContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: { cookie: `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken()}` } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

afterEach(async () => {
  const db = await getDb();
  if (!db) return;
  if (campaignIds.length) await db.delete(newsletterCampaigns).where(inArray(newsletterCampaigns.id, campaignIds));
  if (subscriptionIds.length) await db.delete(newsletterSubscriptions).where(inArray(newsletterSubscriptions.id, subscriptionIds));
  campaignIds.length = 0;
  subscriptionIds.length = 0;
});

describe("owner newsletter campaign drafts", () => {
  it("counts active subscribers only and saves a draft without any recipient delivery row", async () => {
    const db = await getDb();
    expect(db).not.toBeNull();
    const suffix = nanoid(12).toLowerCase();
    const before = Number((await db!.select({ value: count() }).from(newsletterSubscriptions).where(eq(newsletterSubscriptions.status, "active")))[0]?.value ?? 0);
    const active = await db!.insert(newsletterSubscriptions).values({ email: `qa-active-${suffix}@example.test`, unsubscribeToken: nanoid(40), status: "active" });
    const unsubscribed = await db!.insert(newsletterSubscriptions).values({ email: `qa-unsubscribed-${suffix}@example.test`, unsubscribeToken: nanoid(40), status: "unsubscribed", unsubscribedAt: new Date() });
    subscriptionIds.push(Number((active as any)[0]?.insertId), Number((unsubscribed as any)[0]?.insertId));

    const result = await appRouter.createCaller(adminContext()).storefront.owner.createNewsletterCampaign({ subject: "QA draft only", body: "This temporary verification draft is not sent." });
    campaignIds.push(result.id);
    expect(result.recipientCount).toBe(before + 1);
    const campaign = await db!.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, result.id)).limit(1);
    const deliveries = await db!.select().from(newsletterCampaignRecipients).where(eq(newsletterCampaignRecipients.campaignId, result.id));
    expect(campaign[0]).toMatchObject({ status: "draft", recipientCount: before + 1, subject: "QA draft only" });
    expect(deliveries).toEqual([]);
  });

  it("persists only active recipients through the real database adapter when the mailer is mocked", async () => {
    const db = await getDb();
    expect(db).not.toBeNull();
    const suffix = nanoid(12).toLowerCase();
    const active = await db!.insert(newsletterSubscriptions).values({ email: `qa-send-active-${suffix}@example.test`, unsubscribeToken: nanoid(40), status: "active" });
    const unsubscribed = await db!.insert(newsletterSubscriptions).values({ email: `qa-send-unsubscribed-${suffix}@example.test`, unsubscribeToken: nanoid(40), status: "unsubscribed", unsubscribedAt: new Date() });
    const activeId = Number((active as any)[0]?.insertId);
    const unsubscribedId = Number((unsubscribed as any)[0]?.insertId);
    subscriptionIds.push(activeId, unsubscribedId);
    const campaign = await db!.insert(newsletterCampaigns).values({ subject: "QA mocked send", body: "This test is never sent through a real mail provider.", recipientCount: 1, status: "draft" });
    const campaignId = Number((campaign as any)[0]?.insertId);
    campaignIds.push(campaignId);
    const scopedStore = createNewsletterCampaignDatabaseStore(db!, async () => [
      { id: activeId, email: `qa-send-active-${suffix}@example.test`, unsubscribeToken: "qa-active-token", status: "active" },
      { id: unsubscribedId, email: `qa-send-unsubscribed-${suffix}@example.test`, unsubscribeToken: "qa-unsubscribed-token", status: "unsubscribed" },
    ]);
    const targets: string[] = [];
    await expect(sendNewsletterCampaignNow({ campaignId, confirmation: "SEND", canonicalOrigin: "https://ehode.com", store: scopedStore, makeToken: () => "qa-token", mailer: { send: async ({ to }) => { targets.push(to); return { id: "mocked-message-id" }; } } })).resolves.toMatchObject({ status: "sent", sent: 1, failed: 0 });
    const deliveries = await db!.select().from(newsletterCampaignRecipients).where(eq(newsletterCampaignRecipients.campaignId, campaignId));
    expect(targets).toEqual([`qa-send-active-${suffix}@example.test`]);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({ subscriptionId: activeId, email: `qa-send-active-${suffix}@example.test`, status: "sent", resendMessageId: "mocked-message-id" });
  });
});
