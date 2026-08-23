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

export const newsletterSubscriptionStatusValues = ["active", "unsubscribed"] as const;

/** Marketing opt-ins are intentionally separate from buyer order emails and remain private to the shop owner. */
export const newsletterSubscriptions = mysqlTable("newsletterSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  status: mysqlEnum("status", newsletterSubscriptionStatusValues).default("active").notNull(),
  consentedAt: timestamp("consentedAt").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("newsletter_subscriptions_email_unique").on(table.email), index("newsletter_subscriptions_status_idx").on(table.status)]);

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
}, (table) => [uniqueIndex("orders_payment_order_unique").on(table.paymentOrderId), uniqueIndex("orders_receipt_token_unique").on(table.receiptToken), index("orders_buyer_idx").on(table.buyerUserId)]);

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
  orderItemId: int("orderItemId").references(() => marketplaceOrderItems.id, { onDelete: "set null" }),
  rating: int("rating").notNull(),
  body: text("body"),
  status: mysqlEnum("status", reviewStatusValues).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("reviews_listing_idx").on(table.listingId), index("reviews_buyer_idx").on(table.buyerUserId)]);
