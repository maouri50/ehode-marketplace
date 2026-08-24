import { and, asc, eq } from "drizzle-orm";
import { newsletterCampaignProducts, newsletterCampaignRecipients, newsletterCampaigns, newsletterSubscriptions } from "../drizzle/schema";
import { selectActiveCampaignRecipients, type NewsletterCampaignTemplate, type NewsletterCampaignStore, type StoredCampaignSubscriber } from "./newsletterCampaign";

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
    createDraft: async (campaign) => {
      const inserted = await db.insert(newsletterCampaigns).values({ subject: campaign.subject, body: campaign.body, recipientCount: campaign.recipientCount, templateType: campaign.templateType, seasonLabel: campaign.seasonLabel, status: "draft" });
      const campaignId = Number((inserted as any)[0]?.insertId);
      if (campaignId && campaign.products.length) await db.insert(newsletterCampaignProducts).values(campaign.products.map((product, index) => ({ campaignId, listingId: product.listingId, handle: product.handle, title: product.title, priceAmount: product.priceAmount, currencyCode: product.currencyCode, coverImageUrl: product.coverImageUrl, sortOrder: index })));
      return campaignId;
    },
    claimDraft: async (campaignId) => affectedRows(await db.update(newsletterCampaigns).set({ status: "sending", deliveryError: null }).where(and(eq(newsletterCampaigns.id, campaignId), eq(newsletterCampaigns.status, "draft")))) === 1,
    getCampaign: async (campaignId) => {
      const campaign = (await db.select({ subject: newsletterCampaigns.subject, body: newsletterCampaigns.body, templateType: newsletterCampaigns.templateType, seasonLabel: newsletterCampaigns.seasonLabel }).from(newsletterCampaigns).where(eq(newsletterCampaigns.id, campaignId)).limit(1))[0];
      if (!campaign) return null;
      const products = await db.select({ listingId: newsletterCampaignProducts.listingId, handle: newsletterCampaignProducts.handle, title: newsletterCampaignProducts.title, priceAmount: newsletterCampaignProducts.priceAmount, currencyCode: newsletterCampaignProducts.currencyCode, coverImageUrl: newsletterCampaignProducts.coverImageUrl, sortOrder: newsletterCampaignProducts.sortOrder }).from(newsletterCampaignProducts).where(eq(newsletterCampaignProducts.campaignId, campaignId)).orderBy(asc(newsletterCampaignProducts.sortOrder));
      return { ...campaign, templateType: campaign.templateType as NewsletterCampaignTemplate, products };
    },
    activeSubscribers: async () => selectActiveCampaignRecipients(await listSubscribers()),
    setUnsubscribeToken: async (subscriptionId, unsubscribeToken) => { await db.update(newsletterSubscriptions).set({ unsubscribeToken }).where(eq(newsletterSubscriptions.id, subscriptionId)); },
    recordRecipient: async (recipient) => { await db.insert(newsletterCampaignRecipients).values({ ...recipient, sentAt: new Date() }); },
    completeCampaign: async (result) => { await db.update(newsletterCampaigns).set({ status: result.status, recipientCount: result.recipientCount, sentAt: new Date(), deliveryError: result.error }).where(eq(newsletterCampaigns.id, result.campaignId)); },
  };
}
