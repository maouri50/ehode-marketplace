import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { buyerWishlistItems, downloadGrants, marketplaceListings, marketplaceOrderItems, marketplaceOrders, productAssets } from "../../drizzle/schema";
import { clearBuyerSession, loginBuyerAccount, registerBuyerAccount, setBuyerSession } from "../buyerAuth";
import { ensureBuyerFeatureSchema } from "../buyerSchema";
import { getDb } from "../db";
import { buyerSessionProcedure, publicProcedure, router } from "../_core/trpc";

const buyerEmail = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
const buyerPassword = z.string().min(10, "Use at least 10 characters.").max(128);
const buyerName = z.string().trim().min(2).max(120);

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Buyer accounts are temporarily unavailable." });
  await ensureBuyerFeatureSchema(db);
  return db;
}

export const buyerRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.buyer),
  register: publicProcedure.input(z.object({ displayName: buyerName, email: buyerEmail, password: buyerPassword })).mutation(async ({ input, ctx }) => {
    const result = await registerBuyerAccount(input);
    if (!result.ok) throw new TRPCError({ code: "CONFLICT", message: "An account already exists for this email. Please log in instead." });
    setBuyerSession(ctx, result.session.token);
    return { buyer: result.buyer };
  }),
  login: publicProcedure.input(z.object({ email: buyerEmail, password: buyerPassword })).mutation(async ({ input, ctx }) => {
    const result = await loginBuyerAccount(input);
    if (!result.ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
    setBuyerSession(ctx, result.session.token);
    return { buyer: result.buyer };
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    clearBuyerSession(ctx);
    return { success: true as const };
  }),
  orders: buyerSessionProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const orders = await db.select({ id: marketplaceOrders.id, receiptToken: marketplaceOrders.receiptToken, purchasedAt: marketplaceOrders.purchasedAt, totalAmount: marketplaceOrders.totalAmount, currencyCode: marketplaceOrders.currencyCode, status: marketplaceOrders.status })
      .from(marketplaceOrders).where(eq(marketplaceOrders.buyerAccountId, ctx.buyer.id)).orderBy(desc(marketplaceOrders.purchasedAt)).limit(100);
    if (!orders.length) return [];
    const orderIds = orders.map((order) => order.id);
    const items = await db.select({ id: marketplaceOrderItems.id, orderId: marketplaceOrderItems.orderId, title: marketplaceOrderItems.title, listingId: marketplaceOrderItems.listingId })
      .from(marketplaceOrderItems).where(inArray(marketplaceOrderItems.orderId, orderIds));
    const grants = items.length ? await db.select({ orderItemId: downloadGrants.orderItemId, token: downloadGrants.accessToken, filename: productAssets.originalFilename })
      .from(downloadGrants).innerJoin(productAssets, eq(downloadGrants.assetId, productAssets.id)).where(inArray(downloadGrants.orderItemId, items.map((item) => item.id))) : [];
    return orders.map((order) => ({ ...order, items: items.filter((item) => item.orderId === order.id).map((item) => ({ ...item, downloads: grants.filter((grant) => grant.orderItemId === item.id).map((grant) => ({ token: grant.token, filename: grant.filename })) })) }));
  }),
  wishlist: router({
    list: buyerSessionProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select({ listingId: marketplaceListings.id, handle: marketplaceListings.handle, title: marketplaceListings.title, priceAmount: marketplaceListings.priceAmount, currencyCode: marketplaceListings.currencyCode, coverImageUrl: marketplaceListings.coverImageUrl, createdAt: buyerWishlistItems.createdAt })
        .from(buyerWishlistItems).innerJoin(marketplaceListings, eq(buyerWishlistItems.listingId, marketplaceListings.id))
        .where(eq(buyerWishlistItems.buyerAccountId, ctx.buyer.id)).orderBy(desc(buyerWishlistItems.createdAt));
    }),
    add: buyerSessionProcedure.input(z.object({ listingId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const listing = await db.select({ id: marketplaceListings.id, status: marketplaceListings.status }).from(marketplaceListings).where(eq(marketplaceListings.id, input.listingId)).limit(1);
      if (!listing[0] || listing[0].status !== "published") throw new TRPCError({ code: "NOT_FOUND", message: "This product is unavailable." });
      const existing = await db.select({ listingId: buyerWishlistItems.listingId }).from(buyerWishlistItems).where(eq(buyerWishlistItems.buyerAccountId, ctx.buyer.id)).limit(1000);
      if (!existing.some((item) => item.listingId === input.listingId)) {
        try { await db.insert(buyerWishlistItems).values({ buyerAccountId: ctx.buyer.id, listingId: input.listingId }); } catch { /* existing unique wishlist entry is intentionally idempotent */ }
      }
      return { success: true as const };
    }),
    remove: buyerSessionProcedure.input(z.object({ listingId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await db.delete(buyerWishlistItems).where(and(eq(buyerWishlistItems.buyerAccountId, ctx.buyer.id), eq(buyerWishlistItems.listingId, input.listingId)));
      return { success: true as const };
    }),
  }),
});
