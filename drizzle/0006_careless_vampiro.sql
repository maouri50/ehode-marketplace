CREATE TABLE `newsletterCampaignRecipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`subscriptionId` int,
	`email` varchar(320) NOT NULL,
	`status` enum('sent','failed') NOT NULL,
	`resendMessageId` varchar(255),
	`deliveryError` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `newsletterCampaignRecipients_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_campaign_recipient_unique` UNIQUE(`campaignId`,`email`)
);
--> statement-breakpoint
CREATE TABLE `newsletterCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`recipientCount` int NOT NULL DEFAULT 0,
	`status` enum('draft','sending','sent','partial','failed') NOT NULL DEFAULT 'draft',
	`sentAt` timestamp,
	`deliveryError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `newsletterCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `newsletterSubscriptions` ADD `unsubscribeToken` varchar(96);--> statement-breakpoint
ALTER TABLE `newsletterSubscriptions` ADD CONSTRAINT `newsletter_subscriptions_unsubscribe_token_unique` UNIQUE(`unsubscribeToken`);--> statement-breakpoint
ALTER TABLE `newsletterCampaignRecipients` ADD CONSTRAINT `ncr_campaign_fk` FOREIGN KEY (`campaignId`) REFERENCES `newsletterCampaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `newsletterCampaignRecipients` ADD CONSTRAINT `ncr_subscription_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `newsletterSubscriptions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `newsletter_campaign_recipients_campaign_idx` ON `newsletterCampaignRecipients` (`campaignId`);--> statement-breakpoint
CREATE INDEX `newsletter_campaigns_status_idx` ON `newsletterCampaigns` (`status`);--> statement-breakpoint
CREATE INDEX `newsletter_campaigns_created_idx` ON `newsletterCampaigns` (`createdAt`);
