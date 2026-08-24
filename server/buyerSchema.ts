import { sql } from "drizzle-orm";

let buyerFeatureSchemaEnsured = false;

/**
 * Restores only additive buyer-facing tables/columns when an older production
 * database has not yet received the buyer-account migrations. It never inserts
 * a buyer, review, contact message, or wishlist item.
 */
export async function ensureBuyerFeatureSchema(db: any) {
  if (buyerFeatureSchemaEnsured) return;

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS \`buyerAccounts\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`email\` varchar(320) NOT NULL,
      \`displayName\` varchar(120) NOT NULL,
      \`passwordHash\` varchar(255) NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`buyer_accounts_email_unique\` (\`email\`)
    )
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS \`buyerSessions\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`buyerAccountId\` int NOT NULL,
      \`tokenHash\` varchar(128) NOT NULL,
      \`expiresAt\` timestamp NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`lastSeenAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`buyer_sessions_token_unique\` (\`tokenHash\`)
    )
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS \`buyerWishlistItems\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`buyerAccountId\` int NOT NULL,
      \`listingId\` int NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`buyer_wishlist_account_listing_unique\` (\`buyerAccountId\`, \`listingId\`)
    )
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS \`contactMessages\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`buyerAccountId\` int NULL,
      \`name\` varchar(120) NOT NULL,
      \`email\` varchar(320) NOT NULL,
      \`subject\` varchar(180) NOT NULL,
      \`message\` text NOT NULL,
      \`status\` enum('new','read','archived') NOT NULL DEFAULT 'new',
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    )
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS \`buyerReviews\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`listingId\` int NOT NULL,
      \`buyerUserId\` int NULL,
      \`buyerAccountId\` int NULL,
      \`orderItemId\` int NULL,
      \`rating\` int NOT NULL,
      \`body\` text NULL,
      \`status\` enum('pending','published','hidden') NOT NULL DEFAULT 'pending',
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`reviews_order_item_unique\` (\`orderItemId\`)
    )
  `));

  await db.execute(sql.raw("ALTER TABLE `marketplaceOrders` ADD COLUMN IF NOT EXISTS `buyerAccountId` int NULL"));
  await db.execute(sql.raw("ALTER TABLE `buyerReviews` ADD COLUMN IF NOT EXISTS `buyerAccountId` int NULL"));
  await db.execute(sql.raw("ALTER TABLE `buyerReviews` ADD COLUMN IF NOT EXISTS `orderItemId` int NULL"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `buyer_sessions_account_idx` ON `buyerSessions` (`buyerAccountId`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `buyer_sessions_expiry_idx` ON `buyerSessions` (`expiresAt`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `buyer_wishlist_account_idx` ON `buyerWishlistItems` (`buyerAccountId`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `buyer_wishlist_listing_idx` ON `buyerWishlistItems` (`listingId`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `contact_messages_status_idx` ON `contactMessages` (`status`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `contact_messages_created_idx` ON `contactMessages` (`createdAt`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `contact_messages_account_idx` ON `contactMessages` (`buyerAccountId`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `orders_buyer_account_idx` ON `marketplaceOrders` (`buyerAccountId`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `reviews_listing_idx` ON `buyerReviews` (`listingId`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `reviews_buyer_account_idx` ON `buyerReviews` (`buyerAccountId`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `reviews_status_idx` ON `buyerReviews` (`status`)"));
  buyerFeatureSchemaEnsured = true;
}
