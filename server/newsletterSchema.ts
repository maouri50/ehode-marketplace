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
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `newsletter_campaign_recipients_campaign_idx` ON `newsletterCampaignRecipients` (`campaignId`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `newsletter_campaigns_status_idx` ON `newsletterCampaigns` (`status`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `newsletter_campaigns_created_idx` ON `newsletterCampaigns` (`createdAt`)"));
  campaignSchemaEnsured = true;
}
