import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Buyer identities are separate from Manus-authenticated users and the standalone owner-admin password. */
export const buyerAccounts = mysqlTable("buyerAccounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("buyer_accounts_email_unique").on(table.email)]);

/** Opaque buyer session tokens are hashed before persistence and revoked by deleting the row. */
export const buyerSessions = mysqlTable("buyerSessions", {
  id: int("id").autoincrement().primaryKey(),
  buyerAccountId: int("buyerAccountId").notNull().references(() => buyerAccounts.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("buyer_sessions_token_unique").on(table.tokenHash), index("buyer_sessions_account_idx").on(table.buyerAccountId), index("buyer_sessions_expiry_idx").on(table.expiresAt)]);

/** Raw reset tokens are never stored; each hashed token can be consumed once before expiry. */
export const buyerPasswordResetTokens = mysqlTable("buyerPasswordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  buyerAccountId: int("buyerAccountId").notNull().references(() => buyerAccounts.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("buyer_password_reset_token_unique").on(table.tokenHash), index("buyer_password_reset_account_idx").on(table.buyerAccountId), index("buyer_password_reset_expiry_idx").on(table.expiresAt)]);

/** Wishlists are private to the buyer account and hold only real marketplace listings. */
export const buyerWishlistItems = mysqlTable("buyerWishlistItems", {
  id: int("id").autoincrement().primaryKey(),
  buyerAccountId: int("buyerAccountId").notNull().references(() => buyerAccounts.id, { onDelete: "cascade" }),
  listingId: int("listingId").notNull().references(() => marketplaceListings.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("buyer_wishlist_account_listing_unique").on(table.buyerAccountId, table.listingId), index("buyer_wishlist_account_idx").on(table.buyerAccountId), index("buyer_wishlist_listing_idx").on(table.listingId)]);

export const contactMessageStatusValues = ["new", "read", "archived"] as const;

/** Contact messages are private to the owner and are never exposed through public storefront queries. */
export const contactMessages = mysqlTable("contactMessages", {
  id: int("id").autoincrement().primaryKey(),
  buyerAccountId: int("buyerAccountId").references(() => buyerAccounts.id, { onDelete: "set null" }),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 180 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", contactMessageStatusValues).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("contact_messages_status_idx").on(table.status), index("contact_messages_created_idx").on(table.createdAt), index("contact_messages_account_idx").on(table.buyerAccountId)]);

export const newsletterSubscriptionStatusValues = ["active", "unsubscribed"] as const;

/** Marketing opt-ins are intentionally separate from buyer order emails and remain private to the shop owner. */
export const newsletterSubscriptions = mysqlTable("newsletterSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  unsubscribeToken: varchar("unsubscribeToken", { length: 96 }),
  status: mysqlEnum("status", newsletterSubscriptionStatusValues).default("active").notNull(),
  consentedAt: timestamp("consentedAt").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("newsletter_subscriptions_email_unique").on(table.email), uniqueIndex("newsletter_subscriptions_unsubscribe_token_unique").on(table.unsubscribeToken), index("newsletter_subscriptions_status_idx").on(table.status)]);

export const newsletterCampaignStatusValues = ["draft", "sending", "sent", "partial", "failed"] as const;
export const newsletterCampaignRecipientStatusValues = ["sent", "failed"] as const;
export const newsletterCampaignTemplateValues = ["manual", "latest", "seasonal", "selected"] as const;

/** Campaigns are created and dispatched only by an authenticated owner action; drafting never sends email. */
export const newsletterCampaigns = mysqlTable("newsletterCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  subject: varchar("subject", { length: 180 }).notNull(),
  body: text("body").notNull(),
  templateType: mysqlEnum("templateType", newsletterCampaignTemplateValues).default("manual").notNull(),
  seasonLabel: varchar("seasonLabel", { length: 120 }),
  recipientCount: int("recipientCount").default(0).notNull(),
  status: mysqlEnum("status", newsletterCampaignStatusValues).default("draft").notNull(),
  sentAt: timestamp("sentAt"),
  deliveryError: text("deliveryError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("newsletter_campaigns_status_idx").on(table.status), index("newsletter_campaigns_created_idx").on(table.createdAt)]);

/** Product snapshots keep sent newsletter content stable even if a listing later changes. */
export const newsletterCampaignProducts = mysqlTable("newsletterCampaignProducts", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull().references(() => newsletterCampaigns.id, { onDelete: "cascade" }),
  listingId: int("listingId").references(() => marketplaceListings.id, { onDelete: "set null" }),
  handle: varchar("handle", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  priceAmount: varchar("priceAmount", { length: 40 }).notNull(),
  currencyCode: varchar("currencyCode", { length: 8 }).notNull(),
  coverImageUrl: text("coverImageUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("newsletter_campaign_products_campaign_idx").on(table.campaignId), index("newsletter_campaign_products_listing_idx").on(table.listingId)]);

/** Private delivery log for one campaign recipient. No recipient sees any other subscriber. */
export const newsletterCampaignRecipients = mysqlTable("newsletterCampaignRecipients", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull().references(() => newsletterCampaigns.id, { onDelete: "cascade" }),
  subscriptionId: int("subscriptionId").references(() => newsletterSubscriptions.id, { onDelete: "set null" }),
  email: varchar("email", { length: 320 }).notNull(),
  status: mysqlEnum("status", newsletterCampaignRecipientStatusValues).notNull(),
  resendMessageId: varchar("resendMessageId", { length: 255 }),
  deliveryError: text("deliveryError"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("newsletter_campaign_recipient_unique").on(table.campaignId, table.email), index("newsletter_campaign_recipients_campaign_idx").on(table.campaignId)]);

/** A single owner-managed storefront announcement bar, kept separate from shopper data. */
export const announcementBarSettings = mysqlTable("announcementBarSettings", {
  id: int("id").primaryKey(),
  backgroundColor: varchar("backgroundColor", { length: 7 }).default("#f1641e").notNull(),
  textColor: varchar("textColor", { length: 7 }).default("#ffffff").notNull(),
  fontFamily: varchar("fontFamily", { length: 24 }).default("sans").notNull(),
  rotationSeconds: int("rotationSeconds").default(4).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Ordered owner-authored announcements; only their text is visible to visitors. */
export const announcementBarMessages = mysqlTable("announcementBarMessages", {
  id: int("id").autoincrement().primaryKey(),
  message: varchar("message", { length: 220 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("announcement_bar_messages_active_idx").on(table.isActive), index("announcement_bar_messages_order_idx").on(table.sortOrder)]);

export const sellerStatusValues = ["active", "invited", "suspended"] as const;
export const shopStatusValues = ["active", "draft", "archived"] as const;
export const listingStatusValues = ["draft", "published", "archived"] as const;
export const orderStatusValues = ["pending", "paid", "fulfilled", "refunded", "cancelled"] as const;
export const reviewStatusValues = ["pending", "published", "hidden"] as const;

/** The launch uses one seller and one shop; these tables avoid a future catalog migration. */
export const sellers = mysqlTable("sellers", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").references(() => users.id, { onDelete: "set null" }),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  status: mysqlEnum("status", sellerStatusValues).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("sellers_owner_idx").on(table.ownerUserId)]);

export const shops = mysqlTable("shops", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull().references(() => sellers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  handle: varchar("handle", { length: 120 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", shopStatusValues).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("shops_handle_unique").on(table.handle), index("shops_seller_idx").on(table.sellerId)]);

export const catalogCategories = mysqlTable("catalogCategories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  handle: varchar("handle", { length: 120 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("categories_handle_unique").on(table.handle)]);

/** First-party listings launch with PayPal; the external ID column preserves a later provider migration path. */
export const marketplaceListings = mysqlTable("marketplaceListings", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull().references(() => shops.id, { onDelete: "cascade" }),
  categoryId: int("categoryId").references(() => catalogCategories.id, { onDelete: "set null" }),
  externalProductId: varchar("shopifyProductId", { length: 255 }).notNull(),
  handle: varchar("handle", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  productType: varchar("productType", { length: 120 }),
  priceAmount: varchar("priceAmount", { length: 40 }).default("0.00").notNull(),
  currencyCode: varchar("currencyCode", { length: 8 }).default("USD").notNull(),
  coverImageUrl: text("coverImageUrl"),
  licenseName: varchar("licenseName", { length: 160 }),
  featured: int("featured").default(0).notNull(),
  status: mysqlEnum("status", listingStatusValues).default("draft").notNull(),
  isDigital: int("isDigital").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("listings_external_product_unique").on(table.externalProductId),
  uniqueIndex("listings_handle_unique").on(table.handle),
  index("listings_shop_idx").on(table.shopId),
  index("listings_category_idx").on(table.categoryId),
]);

export const productAssets = mysqlTable("productAssets", {
  id: int("id").autoincrement().primaryKey(),
  listingId: int("listingId").notNull().references(() => marketplaceListings.id, { onDelete: "cascade" }),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("product_assets_listing_idx").on(table.listingId)]);

export const marketplaceOrders = mysqlTable("marketplaceOrders", {
  id: int("id").autoincrement().primaryKey(),
  paymentOrderId: varchar("shopifyOrderId", { length: 255 }).notNull(),
  receiptToken: varchar("receiptToken", { length: 128 }).notNull(),
  buyerUserId: int("buyerUserId").references(() => users.id, { onDelete: "set null" }),
  buyerAccountId: int("buyerAccountId").references(() => buyerAccounts.id, { onDelete: "set null" }),
  buyerEmail: varchar("buyerEmail", { length: 320 }),
  deliveryEmailStatus: varchar("deliveryEmailStatus", { length: 24 }).default("pending").notNull(),
  deliveryEmailMessageId: varchar("deliveryEmailMessageId", { length: 255 }),
  deliveryEmailSentAt: timestamp("deliveryEmailSentAt"),
  deliveryEmailError: text("deliveryEmailError"),
  currencyCode: varchar("currencyCode", { length: 8 }).notNull(),
  totalAmount: varchar("totalAmount", { length: 40 }).notNull(),
  status: mysqlEnum("status", orderStatusValues).default("pending").notNull(),
  purchasedAt: timestamp("purchasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("orders_payment_order_unique").on(table.paymentOrderId), uniqueIndex("orders_receipt_token_unique").on(table.receiptToken), index("orders_buyer_idx").on(table.buyerUserId), index("orders_buyer_account_idx").on(table.buyerAccountId)]);

export const marketplaceOrderItems = mysqlTable("marketplaceOrderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => marketplaceOrders.id, { onDelete: "cascade" }),
  listingId: int("listingId").references(() => marketplaceListings.id, { onDelete: "set null" }),
  paymentLineItemRef: varchar("shopifyLineItemId", { length: 255 }),
  title: varchar("title", { length: 255 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: varchar("unitPrice", { length: 40 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("order_items_order_idx").on(table.orderId), index("order_items_listing_idx").on(table.listingId)]);

export const downloadGrants = mysqlTable("downloadGrants", {
  id: int("id").autoincrement().primaryKey(),
  orderItemId: int("orderItemId").notNull().references(() => marketplaceOrderItems.id, { onDelete: "cascade" }),
  assetId: int("assetId").notNull().references(() => productAssets.id, { onDelete: "cascade" }),
  accessToken: varchar("accessToken", { length: 128 }).notNull(),
  downloadCount: int("downloadCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("download_grants_token_unique").on(table.accessToken), index("download_grants_item_idx").on(table.orderItemId)]);

/** Reserved for the future multi-vendor marketplace; no payout flow is enabled at launch. */
export const commissionPolicies = mysqlTable("commissionPolicies", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").references(() => shops.id, { onDelete: "cascade" }),
  commissionRateBasisPoints: int("commissionRateBasisPoints").default(0).notNull(),
  isActive: int("isActive").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Review records remain disabled in the launch interface and no review data is seeded. */
export const buyerReviews = mysqlTable("buyerReviews", {
  id: int("id").autoincrement().primaryKey(),
  listingId: int("listingId").notNull().references(() => marketplaceListings.id, { onDelete: "cascade" }),
  buyerUserId: int("buyerUserId").references(() => users.id, { onDelete: "set null" }),
  buyerAccountId: int("buyerAccountId").references(() => buyerAccounts.id, { onDelete: "set null" }),
  orderItemId: int("orderItemId").references(() => marketplaceOrderItems.id, { onDelete: "set null" }),
  rating: int("rating").notNull(),
  body: text("body"),
  status: mysqlEnum("status", reviewStatusValues).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("reviews_order_item_unique").on(table.orderItemId), index("reviews_listing_idx").on(table.listingId), index("reviews_buyer_idx").on(table.buyerUserId), index("reviews_buyer_account_idx").on(table.buyerAccountId), index("reviews_status_idx").on(table.status)]);
