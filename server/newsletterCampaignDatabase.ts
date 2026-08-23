import { and, eq } from "drizzle-orm";
import { newsletterCampaignRecipients, newsletterCampaigns, newsletterSubscriptions } from "../drizzle/schema";
import { selectActiveCampaignRecipients, type NewsletterCampaignStore, type StoredCampaignSubscriber } from "./newsletterCampaign";

function affectedRows(result: unknown) {
  const value = Array.isArray(result) ? result[0] : result;
  if (!value || typeof value !== "object") return 0;
  const record = value as { affectedRows?: unknown; rowsAffected?: unknown; rowCount?: unknown };
  const count = record.affectedRows ?? record.rowsAffected ?? record.rowCount;
  return typeof count === "number" ? count : 0;
}

/** Converts the private newsletter tables into the campaign-service contract. The optional source exists only for isolated tests. */
export function createNewsletterCampaignDatabaseStore(db: any, subscriberSource?: () => Promise<StoredCampaignSubscriber[]>): NewsletterCampaignStore {
  const listSubscribers = subscriberSource ?? (async () => db.select({ id: newsletterSubscriptions.id, email: newsletterSubscriptions.email, unsubscribeToken: newsletterSubscriptions.unsubscribeToken, status: newsletterSubscriptions.status }).from(newsletterSubscriptions) as Promise<StoredCampaignSubscriber[]>);
  return {
    countActiveSubscribers: async () => selectActiveCampaignRecipients(await listSubscribers()).length,
    createDraft: async (campaign) => Number((await db.insert(newsletterCampaigns).values({ ...campaign, status: "draft" }) as any)[0]?.insertId),
    claimDraft: async (campaignId) => affectedRows(await db.update(newsletterCampaigns).set({ status: "sending", deliveryError: null }).where(and(eq(newsletterCampaigns.id, campaignId), eq(newsletterCampaigns.status, "draft")))) === 1,
    getCampaign: async (campaignId) => (await db.select({ subject: newsletterCampaigns.subject, body: newsletterCampaigns.body }).from(newsletterCampaigns).where(eq(newsletterCampaigns.id, campaignId)).limit(1))[0] ?? null,
    activeSubscribers: async () => selectActiveCampaignRecipients(await listSubscribers()),
    setUnsubscribeToken: async (subscriptionId, unsubscribeToken) => { await db.update(newsletterSubscriptions).set({ unsubscribeToken }).where(eq(newsletterSubscriptions.id, subscriptionId)); },
    recordRecipient: async (recipient) => { await db.insert(newsletterCampaignRecipients).values({ ...recipient, sentAt: new Date() }); },
    completeCampaign: async (result) => { await db.update(newsletterCampaigns).set({ status: result.status, recipientCount: result.recipientCount, sentAt: new Date(), deliveryError: result.error }).where(eq(newsletterCampaigns.id, result.campaignId)); },
  };
}
