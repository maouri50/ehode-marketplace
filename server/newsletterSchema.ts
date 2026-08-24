import { sql } from "drizzle-orm";

let subscriptionSchemaEnsured = false;
let campaignSchemaEnsured = false;

function messageFrom(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause;
    return `${error.message} ${cause instanceof Error ? cause.message : String(cause ?? "")}`;
  }
  return String(error ?? "");
}

/** True only for the missing-table/column shape encountered when an older Vercel database is still in use. */
export function isMissingNewsletterSubscriptionSchema(error: unknown) {
  return /newsletterSubscriptions|unsubscribeToken|ER_NO_SUCH_TABLE|doesn't exist|unknown column/i.test(messageFrom(error));
}

/**
 * Applies the additive subscription schema only after a missing-schema failure.
 * The statements are idempotent and do not read, expose, or create subscriber email data.
 */
export async function ensureNewsletterSubscriptionSchema(db: any) {
  if (subscriptionSchemaEnsured) return;

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS \`newsletterSubscriptions\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`email\` varchar(320) NOT NULL,
      \`status\` enum('active','unsubscribed') NOT NULL DEFAULT 'active',
      \`consentedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`unsubscribedAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`unsubscribeToken\` varchar(96) NULL,
      CONSTRAINT \`newsletterSubscriptions_id\` PRIMARY KEY (\`id\`),
      CONSTRAINT \`newsletter_subscriptions_email_unique\` UNIQUE (\`email\`),
      CONSTRAINT \`newsletter_subscriptions_unsubscribe_token_unique\` UNIQUE (\`unsubscribeToken\`)
    )
  `));
  await db.execute(sql.raw("ALTER TABLE `newsletterSubscriptions` ADD COLUMN IF NOT EXISTS `unsubscribeToken` varchar(96)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `newsletter_subscriptions_status_idx` ON `newsletterSubscriptions` (`status`)"));
  subscriptionSchemaEnsured = true;
}

/** Ensures the private draft and recipient tables exist after an older Vercel database is detected. */
export async function ensureNewsletterCampaignSchema(db: any) {
  if (campaignSchemaEnsured) return;
  await ensureNewsletterSubscriptionSchema(db);
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS \`newsletterCampaigns\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`subject\` varchar(180) NOT NULL,
      \`body\` text NOT NULL,
      \`templateType\` enum('manual','latest','seasonal','selected') NOT NULL DEFAULT 'manual',
      \`seasonLabel\` varchar(120) NULL,
      \`recipientCount\` int NOT NULL DEFAULT 0,
      \`status\` enum('draft','sending','sent','partial','failed') NOT NULL DEFAULT 'draft',
      \`sentAt\` timestamp NULL,
      \`deliveryError\` text NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`newsletterCampaigns_id\` PRIMARY KEY (\`id\`)
    )
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS \`newsletterCampaignProducts\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`campaignId\` int NOT NULL,
      \`listingId\` int NULL,
      \`handle\` varchar(255) NOT NULL,
      \`title\` varchar(255) NOT NULL,
      \`priceAmount\` varchar(40) NOT NULL,
      \`currencyCode\` varchar(8) NOT NULL,
      \`coverImageUrl\` text NULL,
      \`sortOrder\` int NOT NULL DEFAULT 0,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT \`newsletterCampaignProducts_id\` PRIMARY KEY (\`id\`)
    )
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS \`newsletterCampaignRecipients\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`campaignId\` int NOT NULL,
      \`subscriptionId\` int NULL,
      \`email\` varchar(320) NOT NULL,
      \`status\` enum('sent','failed') NOT NULL,
      \`resendMessageId\` varchar(255) NULL,
      \`deliveryError\` text NULL,
      \`sentAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT \`newsletterCampaignRecipients_id\` PRIMARY KEY (\`id\`),
      CONSTRAINT \`newsletter_campaign_recipient_unique\` UNIQUE (\`campaignId\`, \`email\`)
    )
  `));
  // A prior interrupted deployment can leave these tables present but incomplete.
  // Keep every ALTER additive or definition-tightening so no campaign data is removed.
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` ADD COLUMN IF NOT EXISTS `recipientCount` int NOT NULL DEFAULT 0"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` ADD COLUMN IF NOT EXISTS `templateType` enum('manual','latest','seasonal','selected') NOT NULL DEFAULT 'manual'"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` ADD COLUMN IF NOT EXISTS `seasonLabel` varchar(120) NULL"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` ADD COLUMN IF NOT EXISTS `status` enum('draft','sending','sent','partial','failed') NOT NULL DEFAULT 'draft'"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` ADD COLUMN IF NOT EXISTS `sentAt` timestamp NULL"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` ADD COLUMN IF NOT EXISTS `deliveryError` text NULL"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` ADD COLUMN IF NOT EXISTS `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` ADD COLUMN IF NOT EXISTS `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` MODIFY COLUMN `recipientCount` int NOT NULL DEFAULT 0"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` MODIFY COLUMN `status` enum('draft','sending','sent','partial','failed') NOT NULL DEFAULT 'draft'"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaigns` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaignRecipients` ADD COLUMN IF NOT EXISTS `subscriptionId` int NULL"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaignRecipients` ADD COLUMN IF NOT EXISTS `resendMessageId` varchar(255) NULL"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaignRecipients` ADD COLUMN IF NOT EXISTS `deliveryError` text NULL"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaignRecipients` ADD COLUMN IF NOT EXISTS `sentAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaignRecipients` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaignRecipients` MODIFY COLUMN `sentAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaignProducts` ADD COLUMN IF NOT EXISTS `listingId` int NULL"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaignProducts` ADD COLUMN IF NOT EXISTS `coverImageUrl` text NULL"));
  await db.execute(sql.raw("ALTER TABLE `newsletterCampaignProducts` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `newsletter_campaign_recipients_campaign_idx` ON `newsletterCampaignRecipients` (`campaignId`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `newsletter_campaign_products_campaign_idx` ON `newsletterCampaignProducts` (`campaignId`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `newsletter_campaigns_status_idx` ON `newsletterCampaigns` (`status`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `newsletter_campaigns_created_idx` ON `newsletterCampaigns` (`createdAt`)"));
  campaignSchemaEnsured = true;
}
