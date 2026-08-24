import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { Resend } from "resend";
import { z } from "zod";
import { buyerAccounts, buyerReviews, catalogCategories, contactMessages, downloadGrants, marketplaceListings, marketplaceOrderItems, marketplaceOrders, newsletterCampaignRecipients, newsletterCampaigns, newsletterSubscriptions, productAssets, shops } from "../../drizzle/schema";
import { getDb } from "../db";
import { capturePayPalOrder, createPayPalOrder } from "../paypal";
import { storagePut } from "../storage";
import { sendOrderDeliveryEmail } from "../orderDeliveryEmail";
import { normalizeNewsletterEmail, subscribeNewsletter } from "../newsletter";
import { createNewsletterCampaignDraft, newsletterCampaignSendConfirmation, selectActiveCampaignRecipients, sendNewsletterCampaignNow, type NewsletterCampaignProduct } from "../newsletterCampaign";
import { createNewsletterCampaignDatabaseStore } from "../newsletterCampaignDatabase";
import { summarizeNewsletterDeliveryFailures } from "../newsletterDeliveryFailures";
import { ensureNewsletterCampaignSchema, ensureNewsletterSubscriptionSchema, isMissingNewsletterSubscriptionSchema } from "../newsletterSchema";
import { ensureBuyerFeatureSchema } from "../buyerSchema";
import { buildVerifiedReviewPublication } from "../reviewPublication";
import { adminSessionProcedure, buyerSessionProcedure, publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";

const cartInput = z.object({ listingId: z.number().int().positive(), quantity: z.number().int().min(1).max(10) });
const buyerEmailInput = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
const newsletterEmailInput = z.string().trim().email().max(320).transform(normalizeNewsletterEmail);
const contactMessageInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: buyerEmailInput,
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(10).max(6_000),
  website: z.string().max(0).optional(),
});
const reviewInput = z.object({
  orderItemId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(2_000),
});
const newsletterCampaignInput = z.object({
  subject: z.string().trim().min(3).max(180),
  body: z.string().trim().min(10).max(12_000),
  templateType: z.enum(["manual", "latest", "seasonal", "selected"]).default("manual"),
  seasonLabel: z.string().trim().min(2).max(120).optional(),
  listingIds: z.array(z.number().int().positive()).max(6).default([]),
}).superRefine((value, ctx) => {
  if (value.templateType === "seasonal" && !value.seasonLabel) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a season or occasion name for this campaign.", path: ["seasonLabel"] });
  if (["seasonal", "selected"].includes(value.templateType) && value.listingIds.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose at least one published resource for this campaign.", path: ["listingIds"] });
});
const activeListing = eq(marketplaceListings.status, "published");

export function resolveBuyerEmail(buyerEmail: string | null | undefined, paypalPayerEmail: string | null | undefined) {
  return buyerEmail ?? paypalPayerEmail?.trim().toLowerCase() ?? null;
}

function money(value: string | number) {
  return Number(value).toFixed(2);
}

function publicCoverUrl(listingId: number, coverImageUrl: string | null) {
  if (coverImageUrl?.startsWith("product-covers/")) return `/api/cover/${listingId}`;
  return coverImageUrl;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The catalog database is unavailable." });
  return db;
}

async function requireBuyerFeatureDb() {
  const db = await requireDb();
  await ensureBuyerFeatureSchema(db);
  return db;
}

async function selectNewsletterCampaignProducts(db: any, input: z.infer<typeof newsletterCampaignInput>): Promise<NewsletterCampaignProduct[]> {
  if (input.templateType === "manual") return [];
  const requestedIds = Array.from(new Set(input.listingIds));
  const rows = await db.select({ id: marketplaceListings.id, handle: marketplaceListings.handle, title: marketplaceListings.title, priceAmount: marketplaceListings.priceAmount, currencyCode: marketplaceListings.currencyCode, coverImageUrl: marketplaceListings.coverImageUrl })
    .from(marketplaceListings)
    .where(input.templateType === "latest" ? activeListing : and(activeListing, inArray(marketplaceListings.id, requestedIds)))
    .orderBy(desc(marketplaceListings.createdAt))
    .limit(input.templateType === "latest" ? 6 : requestedIds.length);
  const ordered = input.templateType === "latest" ? rows : requestedIds.map((id) => rows.find((row: typeof rows[number]) => row.id === id)).filter(Boolean);
  if (!ordered.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Choose published resources with a public product page before saving this campaign." });
  return ordered.map((listing: any, index: number) => ({ listingId: listing.id, handle: listing.handle, title: listing.title, priceAmount: listing.priceAmount, currencyCode: listing.currencyCode, coverImageUrl: publicCoverUrl(listing.id, listing.coverImageUrl), sortOrder: index }));
}

export const storefrontRouter = router({
  catalog: router({
    list: publicProcedure.input(z.object({ category: z.string().optional(), query: z.string().max(120).optional() }).nullish()).query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select({
        id: marketplaceListings.id,
        handle: marketplaceListings.handle,
        title: marketplaceListings.title,
        description: marketplaceListings.description,
        productType: marketplaceListings.productType,
        priceAmount: marketplaceListings.priceAmount,
        currencyCode: marketplaceListings.currencyCode,
        coverImageUrl: marketplaceListings.coverImageUrl,
        licenseName: marketplaceListings.licenseName,
        featured: marketplaceListings.featured,
        category: catalogCategories.name,
        categoryHandle: catalogCategories.handle,
        assetCount: count(productAssets.id),
      }).from(marketplaceListings)
        .leftJoin(catalogCategories, eq(marketplaceListings.categoryId, catalogCategories.id))
        .leftJoin(productAssets, eq(productAssets.listingId, marketplaceListings.id))
        .where(activeListing)
        .groupBy(marketplaceListings.id, catalogCategories.id)
        .orderBy(desc(marketplaceListings.featured), asc(marketplaceListings.title));

      const query = input?.query?.trim().toLowerCase();
      return rows.filter((row) => {
        if (input?.category && row.categoryHandle !== input.category) return false;
        if (!query) return true;
        return `${row.title} ${row.description ?? ""} ${row.productType ?? ""} ${row.category ?? ""}`.toLowerCase().includes(query);
      }).map((row) => ({ ...row, coverImageUrl: publicCoverUrl(row.id, row.coverImageUrl) }));
    }),
    byHandle: publicProcedure.input(z.object({ handle: z.string().min(1).max(255) })).query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select({
        id: marketplaceListings.id,
        handle: marketplaceListings.handle,
        title: marketplaceListings.title,
        description: marketplaceListings.description,
        productType: marketplaceListings.productType,
        priceAmount: marketplaceListings.priceAmount,
        currencyCode: marketplaceListings.currencyCode,
        coverImageUrl: marketplaceListings.coverImageUrl,
        licenseName: marketplaceListings.licenseName,
        category: catalogCategories.name,
        assetCount: count(productAssets.id),
      }).from(marketplaceListings)
        .leftJoin(catalogCategories, eq(marketplaceListings.categoryId, catalogCategories.id))
        .leftJoin(productAssets, eq(productAssets.listingId, marketplaceListings.id))
        .where(and(activeListing, eq(marketplaceListings.handle, input.handle)))
        .groupBy(marketplaceListings.id, catalogCategories.id)
        .limit(1);
      return rows[0] ? { ...rows[0], coverImageUrl: publicCoverUrl(rows[0].id, rows[0].coverImageUrl) } : null;
    }),
    categories: publicProcedure.query(async () => {
      const db = await requireDb();
      return db.select().from(catalogCategories).where(eq(catalogCategories.isActive, 1)).orderBy(asc(catalogCategories.sortOrder));
    }),
    freeDownload: publicProcedure.input(z.object({ listingId: z.number().int().positive() })).mutation(async ({ input }) => {
      const db = await requireDb();
      const listing = await db.select().from(marketplaceListings).where(and(eq(marketplaceListings.id, input.listingId), activeListing)).limit(1);
      if (!listing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "This resource is not available." });
      if (Number(listing[0].priceAmount) !== 0) throw new TRPCError({ code: "FORBIDDEN", message: "This resource requires checkout." });
      const assets = await db.select().from(productAssets).where(eq(productAssets.listingId, listing[0].id));
      if (!assets.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The free file is still being prepared." });
      return { files: assets.map((asset) => ({ filename: asset.originalFilename, url: `/api/download/free/${listing[0]!.id}/${asset.id}` })) };
    }),
  }),
  newsletter: router({
    subscribe: publicProcedure.input(z.object({ email: newsletterEmailInput })).mutation(async ({ input }) => {
      const db = await requireDb();
      const store = {
        findByEmail: async (email: string) => (await db.select({ id: newsletterSubscriptions.id, status: newsletterSubscriptions.status }).from(newsletterSubscriptions).where(eq(newsletterSubscriptions.email, email)).limit(1))[0] ?? null,
        create: async (email: string, unsubscribeToken: string) => { await db.insert(newsletterSubscriptions).values({ email, unsubscribeToken, status: "active", consentedAt: new Date() }); },
        reactivate: async (id: number) => { await db.update(newsletterSubscriptions).set({ status: "active", consentedAt: new Date(), unsubscribedAt: null }).where(eq(newsletterSubscriptions.id, id)); },
      };
      try {
        return await subscribeNewsletter(store, input.email);
      } catch (error) {
        if (isMissingNewsletterSubscriptionSchema(error)) {
          await ensureNewsletterSubscriptionSchema(db);
          return subscribeNewsletter(store, input.email);
        }
        console.error("[Newsletter] Subscription persistence failed", error instanceof Error ? error.message : error);
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Newsletter signup is temporarily unavailable. Please try again shortly." });
      }
    }),
    unsubscribe: publicProcedure.input(z.object({ token: z.string().min(20).max(96) })).mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(newsletterSubscriptions).set({ status: "unsubscribed", unsubscribedAt: new Date() }).where(eq(newsletterSubscriptions.unsubscribeToken, input.token));
      return { success: true };
    }),
  }),
  contact: router({
    submit: publicProcedure.input(contactMessageInput).mutation(async ({ input, ctx }) => {
      if (input.website) return { success: true as const };
      const db = await requireBuyerFeatureDb();
      const name = ctx.buyer?.displayName || input.name;
      const email = ctx.buyer?.email || input.email;
      await db.insert(contactMessages).values({ buyerAccountId: ctx.buyer?.id ?? null, name, email, subject: input.subject, message: input.message, status: "new" });
      return { success: true as const };
    }),
  }),
  reviews: router({
    list: publicProcedure.input(z.object({ listingId: z.number().int().positive() })).query(async ({ input }) => {
      const db = await requireBuyerFeatureDb();
      return db.select({ id: buyerReviews.id, rating: buyerReviews.rating, body: buyerReviews.body, createdAt: buyerReviews.createdAt, displayName: buyerAccounts.displayName })
        .from(buyerReviews).innerJoin(buyerAccounts, eq(buyerReviews.buyerAccountId, buyerAccounts.id))
        .where(and(eq(buyerReviews.listingId, input.listingId), eq(buyerReviews.status, "published")))
        .orderBy(desc(buyerReviews.createdAt)).limit(50);
    }),
    eligible: buyerSessionProcedure.query(async ({ ctx }) => {
      const db = await requireBuyerFeatureDb();
      const rows = await db.select({ orderItemId: marketplaceOrderItems.id, listingId: marketplaceListings.id, title: marketplaceOrderItems.title, coverImageUrl: marketplaceListings.coverImageUrl, reviewed: buyerReviews.id })
        .from(marketplaceOrderItems)
        .innerJoin(marketplaceOrders, eq(marketplaceOrderItems.orderId, marketplaceOrders.id))
        .innerJoin(marketplaceListings, eq(marketplaceOrderItems.listingId, marketplaceListings.id))
        .leftJoin(buyerReviews, eq(buyerReviews.orderItemId, marketplaceOrderItems.id))
        .where(and(eq(marketplaceOrders.buyerAccountId, ctx.buyer.id), inArray(marketplaceOrders.status, ["paid", "fulfilled"])))
        .orderBy(desc(marketplaceOrders.purchasedAt));
      return rows.filter((row) => !row.reviewed).map((row) => ({ ...row, coverImageUrl: publicCoverUrl(row.listingId, row.coverImageUrl) }));
    }),
    submit: buyerSessionProcedure.input(reviewInput).mutation(async ({ input, ctx }) => {
      const db = await requireBuyerFeatureDb();
      const rows = await db.select({ orderItemId: marketplaceOrderItems.id, listingId: marketplaceOrderItems.listingId, reviewId: buyerReviews.id })
        .from(marketplaceOrderItems)
        .innerJoin(marketplaceOrders, eq(marketplaceOrderItems.orderId, marketplaceOrders.id))
        .leftJoin(buyerReviews, eq(buyerReviews.orderItemId, marketplaceOrderItems.id))
        .where(and(eq(marketplaceOrderItems.id, input.orderItemId), eq(marketplaceOrders.buyerAccountId, ctx.buyer.id), inArray(marketplaceOrders.status, ["paid", "fulfilled"])))
        .limit(1);
      const purchase = rows[0];
      if (!purchase?.listingId) throw new TRPCError({ code: "FORBIDDEN", message: "Only purchased resources can be reviewed." });
      if (purchase.reviewId) throw new TRPCError({ code: "CONFLICT", message: "A review has already been submitted for this purchase." });
      await db.insert(buyerReviews).values(buildVerifiedReviewPublication({ listingId: purchase.listingId, buyerAccountId: ctx.buyer.id, orderItemId: purchase.orderItemId, rating: input.rating, body: input.body }));
      return { success: true as const, message: "Thank you. Your verified review is now live." };
    }),
  }),
  paypal: router({
    config: publicProcedure.query(() => ({ clientId: ENV.paypalClientId, mode: ENV.paypalMode })),
    createOrder: publicProcedure.input(z.object({ items: z.array(cartInput).min(1).max(20), buyerEmail: buyerEmailInput })).mutation(async ({ input }) => {
      const db = await requireDb();
      const ids = Array.from(new Set(input.items.map((item) => item.listingId)));
      const listings = await db.select({
        id: marketplaceListings.id,
        title: marketplaceListings.title,
        priceAmount: marketplaceListings.priceAmount,
        currencyCode: marketplaceListings.currencyCode,
        status: marketplaceListings.status,
        assetCount: count(productAssets.id),
      }).from(marketplaceListings).leftJoin(productAssets, eq(productAssets.listingId, marketplaceListings.id))
        .where(inArray(marketplaceListings.id, ids)).groupBy(marketplaceListings.id);

      if (listings.length !== ids.length || listings.some((listing) => listing.status !== "published")) throw new TRPCError({ code: "BAD_REQUEST", message: "One of the selected products is no longer available." });
      if (listings.some((listing) => listing.assetCount === 0)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A selected product is still being prepared for delivery." });

      const currencyCode = listings[0]?.currencyCode ?? "USD";
      if (listings.some((listing) => listing.currencyCode !== currencyCode)) throw new TRPCError({ code: "BAD_REQUEST", message: "Products must use the same currency at checkout." });
      const quantityById = new Map(input.items.map((item) => [item.listingId, item.quantity]));
      const total = listings.reduce((sum, listing) => sum + Number(listing.priceAmount) * (quantityById.get(listing.id) ?? 1), 0);
      const referenceId = input.items.map((item) => `${item.listingId}:${item.quantity}`).join(",");
      const order = await createPayPalOrder({ referenceId, description: listings.length === 1 ? listings[0]!.title : `${listings.length} digital resources from Ehode`, amount: money(total), currencyCode });
      return { id: order.id };
    }),
    captureOrder: publicProcedure.input(z.object({ paypalOrderId: z.string().min(3).max(255), buyerEmail: buyerEmailInput.nullish() })).mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const captured = await capturePayPalOrder(input.paypalOrderId);
      const referenceId = captured.purchase_units?.[0]?.reference_id ?? "";
      const items = referenceId.split(",").map((part) => { const [id, quantity] = part.split(":"); return { listingId: Number(id), quantity: Number(quantity) || 1 }; }).filter((item) => Number.isInteger(item.listingId) && item.listingId > 0);
      if (!items.length) throw new TRPCError({ code: "BAD_REQUEST", message: "The completed order did not contain a valid product reference." });
      const listingIds = Array.from(new Set(items.map((item) => item.listingId)));
      const listings = await db.select().from(marketplaceListings).where(inArray(marketplaceListings.id, listingIds));
      if (listings.length !== listingIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "The completed order references an unavailable product." });
      const paidAmount = captured.purchase_units?.reduce((sum, unit) => sum + Number(unit.payments?.captures?.[0]?.amount?.value ?? unit.amount?.value ?? 0), 0) ?? 0;
      const currencyCode = captured.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code ?? captured.purchase_units?.[0]?.amount?.currency_code ?? listings[0]!.currencyCode;
      const existing = await db.select().from(marketplaceOrders).where(eq(marketplaceOrders.paymentOrderId, input.paypalOrderId)).limit(1);
      if (existing[0]) return { orderId: existing[0].id, receiptToken: existing[0].receiptToken, alreadyCaptured: true };
      const receiptToken = nanoid(40);
      const resolvedBuyerEmail = resolveBuyerEmail(input.buyerEmail, captured.payer?.email_address);
      const buyerAccountId = ctx.buyer?.email === resolvedBuyerEmail ? ctx.buyer.id : null;
      const insertedOrder = await db.insert(marketplaceOrders).values({ paymentOrderId: input.paypalOrderId, receiptToken, buyerUserId: ctx.user?.id, buyerAccountId, buyerEmail: resolvedBuyerEmail, deliveryEmailStatus: "pending", currencyCode, totalAmount: money(paidAmount), status: "paid", purchasedAt: new Date() });
      const orderId = Number((insertedOrder as any)[0]?.insertId);
      for (const item of items) {
        const listing = listings.find((candidate) => candidate.id === item.listingId)!;
        const insertedItem = await db.insert(marketplaceOrderItems).values({ orderId, listingId: listing.id, paymentLineItemRef: String(listing.id), title: listing.title, quantity: item.quantity, unitPrice: listing.priceAmount });
        const orderItemId = Number((insertedItem as any)[0]?.insertId);
        const assets = await db.select().from(productAssets).where(eq(productAssets.listingId, listing.id));
        for (const asset of assets) await db.insert(downloadGrants).values({ orderItemId, assetId: asset.id, accessToken: nanoid(40) });
      }
      await sendOrderDeliveryEmail({ order: { id: orderId, receiptToken, buyerEmail: resolvedBuyerEmail }, titles: listings.map((listing) => listing.title) });
      return { orderId, receiptToken, alreadyCaptured: false };
    }),
  }),
  downloads: router({
    byReceipt: publicProcedure.input(z.object({ receiptToken: z.string().min(20).max(128) })).query(async ({ input }) => {
      const db = await requireDb();
      const order = await db.select().from(marketplaceOrders).where(eq(marketplaceOrders.receiptToken, input.receiptToken)).limit(1);
      if (!order[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      const rows = await db.select({ grant: downloadGrants, asset: productAssets, item: marketplaceOrderItems }).from(downloadGrants)
        .innerJoin(marketplaceOrderItems, eq(downloadGrants.orderItemId, marketplaceOrderItems.id))
        .innerJoin(productAssets, eq(downloadGrants.assetId, productAssets.id))
        .where(eq(marketplaceOrderItems.orderId, order[0].id));
      return rows.map(({ grant, asset, item }) => ({ token: grant.accessToken, title: item.title, filename: asset.originalFilename, downloadCount: grant.downloadCount }));
    }),
    resolve: publicProcedure.input(z.object({ token: z.string().min(20).max(128) })).mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select({ grant: downloadGrants, asset: productAssets }).from(downloadGrants).innerJoin(productAssets, eq(downloadGrants.assetId, productAssets.id)).where(eq(downloadGrants.accessToken, input.token)).limit(1);
      const row = rows[0];
      if (!row || (row.grant.expiresAt && row.grant.expiresAt < new Date())) throw new TRPCError({ code: "NOT_FOUND", message: "Download access is unavailable." });
      return { url: `/api/download/paid/${encodeURIComponent(input.token)}`, filename: row.asset.originalFilename };
    }),
  }),
  owner: router({
    contactMessages: adminSessionProcedure.query(async () => {
      const db = await requireDb();
      return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(100);
    }),
    setContactMessageStatus: adminSessionProcedure.input(z.object({ messageId: z.number().int().positive(), status: z.enum(["new", "read", "archived"]) })).mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(contactMessages).set({ status: input.status }).where(eq(contactMessages.id, input.messageId));
      return { success: true as const };
    }),
    reviews: adminSessionProcedure.query(async () => {
      const db = await requireDb();
      return db.select({ id: buyerReviews.id, rating: buyerReviews.rating, body: buyerReviews.body, status: buyerReviews.status, createdAt: buyerReviews.createdAt, listingTitle: marketplaceListings.title, buyerDisplayName: buyerAccounts.displayName, buyerEmail: buyerAccounts.email })
        .from(buyerReviews).leftJoin(marketplaceListings, eq(buyerReviews.listingId, marketplaceListings.id)).leftJoin(buyerAccounts, eq(buyerReviews.buyerAccountId, buyerAccounts.id))
        .orderBy(desc(buyerReviews.createdAt)).limit(100);
    }),
    setReviewStatus: adminSessionProcedure.input(z.object({ reviewId: z.number().int().positive(), status: z.enum(["pending", "published", "hidden"]) })).mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(buyerReviews).set({ status: input.status }).where(eq(buyerReviews.id, input.reviewId));
      return { success: true as const };
    }),
    newsletterSubscribers: adminSessionProcedure.query(async () => {
      const db = await requireDb();
      await ensureNewsletterSubscriptionSchema(db);
      return db.select({ id: newsletterSubscriptions.id, email: newsletterSubscriptions.email, status: newsletterSubscriptions.status, consentedAt: newsletterSubscriptions.consentedAt }).from(newsletterSubscriptions).orderBy(desc(newsletterSubscriptions.consentedAt)).limit(250);
    }),
    newsletterCampaigns: adminSessionProcedure.query(async () => {
      const db = await requireDb();
      await ensureNewsletterCampaignSchema(db);
      return db.select().from(newsletterCampaigns).orderBy(desc(newsletterCampaigns.createdAt)).limit(50);
    }),
    newsletterFailureSummaries: adminSessionProcedure.query(async () => {
      const db = await requireDb();
      await ensureNewsletterCampaignSchema(db);
      const rows = await db.select({ campaignId: newsletterCampaignRecipients.campaignId, deliveryError: newsletterCampaignRecipients.deliveryError })
        .from(newsletterCampaignRecipients)
        .where(eq(newsletterCampaignRecipients.status, "failed"))
        .limit(250);
      return summarizeNewsletterDeliveryFailures(rows);
    }),
    newsletterTemplateProducts: adminSessionProcedure.query(async () => {
      const db = await requireDb();
      const rows = await db.select({ id: marketplaceListings.id, handle: marketplaceListings.handle, title: marketplaceListings.title, priceAmount: marketplaceListings.priceAmount, currencyCode: marketplaceListings.currencyCode, coverImageUrl: marketplaceListings.coverImageUrl, productType: marketplaceListings.productType, createdAt: marketplaceListings.createdAt }).from(marketplaceListings).where(activeListing).orderBy(desc(marketplaceListings.createdAt)).limit(30);
      return rows.map((row) => ({ ...row, coverImageUrl: publicCoverUrl(row.id, row.coverImageUrl) }));
    }),
    createNewsletterCampaign: adminSessionProcedure.input(newsletterCampaignInput).mutation(async ({ input }) => {
      const db = await requireDb();
      await ensureNewsletterCampaignSchema(db);
      try {
        const products = await selectNewsletterCampaignProducts(db, input);
        return await createNewsletterCampaignDraft(createNewsletterCampaignDatabaseStore(db), { subject: input.subject, body: input.body, templateType: input.templateType, seasonLabel: input.templateType === "seasonal" ? input.seasonLabel ?? null : null, products });
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Could not create the newsletter draft." });
      }
    }),
    sendNewsletterCampaign: adminSessionProcedure.input(z.object({ campaignId: z.number().int().positive(), confirmation: newsletterCampaignSendConfirmation })).mutation(async ({ input }) => {
      const db = await requireDb();
      await ensureNewsletterCampaignSchema(db);
      if (!ENV.resendApiKey || !ENV.resendFromEmail) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Newsletter email is not configured yet." });
      const resend = new Resend(ENV.resendApiKey);
      try {
        return await sendNewsletterCampaignNow({
          campaignId: input.campaignId,
          confirmation: input.confirmation,
          canonicalOrigin: ENV.canonicalOrigin,
          makeToken: () => nanoid(40),
          store: createNewsletterCampaignDatabaseStore(db),
          mailer: {
            send: async ({ to, subject, html, text, idempotencyKey }) => {
              const response = await resend.emails.send({ from: ENV.resendFromEmail, to: [to], subject, html, text, headers: { "X-Entity-Ref-ID": idempotencyKey } });
              if (response.error || !response.data?.id) throw new Error(response.error?.message || "Resend did not return a message ID.");
              return { id: response.data.id };
            },
          },
        });
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Could not send the newsletter campaign." });
      }
    }),
    orders: adminSessionProcedure.query(async () => {
      const db = await requireDb();
      const orders = await db.select().from(marketplaceOrders).orderBy(desc(marketplaceOrders.createdAt)).limit(30);
      if (!orders.length) return [];
      const orderIds = orders.map((order) => order.id);
      const items = await db.select().from(marketplaceOrderItems).where(inArray(marketplaceOrderItems.orderId, orderIds));
      const orderItemIds = items.map((item) => item.id);
      const grants = orderItemIds.length ? await db.select().from(downloadGrants).where(inArray(downloadGrants.orderItemId, orderItemIds)) : [];
      return orders.map((order) => {
        const orderItems = items.filter((item) => item.orderId === order.id);
        const grantCount = grants.filter((grant) => orderItems.some((item) => item.id === grant.orderItemId)).length;
        return { order, itemCount: orderItems.length, grantCount };
      });
    }),
    listings: adminSessionProcedure.query(async () => {
      const db = await requireDb();
      return db.select({ listing: marketplaceListings, category: catalogCategories, assetCount: count(productAssets.id) }).from(marketplaceListings)
        .leftJoin(catalogCategories, eq(marketplaceListings.categoryId, catalogCategories.id)).leftJoin(productAssets, eq(productAssets.listingId, marketplaceListings.id))
        .groupBy(marketplaceListings.id, catalogCategories.id).orderBy(desc(marketplaceListings.updatedAt));
    }),
    createListing: adminSessionProcedure.input(z.object({ title: z.string().min(3).max(255), description: z.string().max(8000).optional(), priceAmount: z.string().regex(/^\d+(\.\d{1,2})?$/), currencyCode: z.string().length(3).default("USD"), productType: z.string().max(120).optional(), categoryId: z.number().int().positive().optional(), coverImageUrl: z.string().url().optional(), licenseName: z.string().max(160).optional() })).mutation(async ({ input }) => {
      const db = await requireDb();
      const shop = await db.select({ id: shops.id }).from(shops).where(eq(shops.status, "active")).limit(1);
      if (!shop[0]) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create an active shop before adding products." });
      const handle = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 100) || "resource"}-${nanoid(6).toLowerCase()}`;
      const externalProductId = `ehode-${nanoid(14)}`;
      await db.insert(marketplaceListings).values({ shopId: shop[0].id, categoryId: input.categoryId ?? null, externalProductId, handle, title: input.title, description: input.description ?? null, productType: input.productType ?? null, priceAmount: money(input.priceAmount), currencyCode: input.currencyCode.toUpperCase(), coverImageUrl: input.coverImageUrl ?? null, licenseName: input.licenseName ?? null, status: "draft", isDigital: 1, featured: 0 });
      return { success: true };
    }),
    updateListing: adminSessionProcedure.input(z.object({ listingId: z.number().int().positive(), title: z.string().min(3).max(255), description: z.string().max(8000).nullable(), priceAmount: z.string().regex(/^\d+(\.\d{1,2})?$/), currencyCode: z.string().length(3), productType: z.string().max(120).nullable(), categoryId: z.number().int().positive().nullable(), coverImageUrl: z.string().url().nullable(), licenseName: z.string().max(160).nullable() })).mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(marketplaceListings).set({ title: input.title, description: input.description, priceAmount: money(input.priceAmount), currencyCode: input.currencyCode.toUpperCase(), productType: input.productType, categoryId: input.categoryId, coverImageUrl: input.coverImageUrl, licenseName: input.licenseName }).where(eq(marketplaceListings.id, input.listingId));
      return { success: true };
    }),
    uploadAsset: adminSessionProcedure.input(z.object({ listingId: z.number().int().positive(), originalFilename: z.string().min(1).max(255), mimeType: z.string().min(1).max(120), base64Data: z.string().min(16).max(30_000_000) })).mutation(async ({ input }) => {
      const db = await requireDb();
      const listing = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, input.listingId)).limit(1);
      if (!listing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found." });
      const data = Buffer.from(input.base64Data, "base64");
      const uploaded = await storagePut(`product-files/${input.listingId}/${input.originalFilename}`, data, input.mimeType);
      await db.insert(productAssets).values({ listingId: input.listingId, storageKey: uploaded.key, originalFilename: input.originalFilename, mimeType: input.mimeType });
      return { success: true };
    }),
    uploadCover: adminSessionProcedure.input(z.object({ listingId: z.number().int().positive(), originalFilename: z.string().min(1).max(255), mimeType: z.string().regex(/^image\/(png|jpeg|webp|gif)$/), base64Data: z.string().min(16).max(18_000_000) })).mutation(async ({ input }) => {
      const db = await requireDb();
      const listing = await db.select({ id: marketplaceListings.id }).from(marketplaceListings).where(eq(marketplaceListings.id, input.listingId)).limit(1);
      if (!listing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found." });
      const safeFilename = input.originalFilename.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const uploaded = await storagePut(
        `product-covers/${input.listingId}/${safeFilename}`,
        Buffer.from(input.base64Data, "base64"),
        input.mimeType,
        { access: "private" },
      );
      await db.update(marketplaceListings).set({ coverImageUrl: uploaded.key }).where(eq(marketplaceListings.id, input.listingId));
      return { url: `/api/cover/${input.listingId}` };
    }),
    completeDirectUpload: adminSessionProcedure.input(z.object({ listingId: z.number().int().positive(), kind: z.enum(["file", "cover"]), storageKey: z.string().min(10).max(500), originalFilename: z.string().min(1).max(255), mimeType: z.string().min(1).max(120) })).mutation(async ({ input }) => {
      const db = await requireDb();
      const listing = await db.select({ id: marketplaceListings.id }).from(marketplaceListings).where(eq(marketplaceListings.id, input.listingId)).limit(1);
      if (!listing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found." });
      const expectedPrefix = input.kind === "cover" ? `product-covers/${input.listingId}/` : `product-files/${input.listingId}/`;
      if (!input.storageKey.startsWith(expectedPrefix)) throw new TRPCError({ code: "BAD_REQUEST", message: "Upload key does not match this product." });
      if (input.kind === "cover") {
        if (!/^image\/(png|jpeg|webp|gif)$/.test(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported cover image type." });
        await db.update(marketplaceListings).set({ coverImageUrl: input.storageKey }).where(eq(marketplaceListings.id, input.listingId));
        return { success: true, url: `/api/cover/${input.listingId}` };
      }
      await db.insert(productAssets).values({ listingId: input.listingId, storageKey: input.storageKey, originalFilename: input.originalFilename, mimeType: input.mimeType });
      return { success: true };
    }),
    setStatus: adminSessionProcedure.input(z.object({ listingId: z.number().int().positive(), status: z.enum(["draft", "published", "archived"]) })).mutation(async ({ input }) => {
      const db = await requireDb();
      if (input.status === "published") {
        const assets = await db.select({ value: count() }).from(productAssets).where(eq(productAssets.listingId, input.listingId));
        if ((assets[0]?.value ?? 0) === 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Upload a digital file before publishing this listing." });
      }
      await db.update(marketplaceListings).set({ status: input.status }).where(eq(marketplaceListings.id, input.listingId));
      return { success: true };
    }),
  }),
});
