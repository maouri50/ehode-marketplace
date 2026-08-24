CREATE TABLE `newsletterCampaignProducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`listingId` int,
	`handle` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`priceAmount` varchar(40) NOT NULL,
	`currencyCode` varchar(8) NOT NULL,
	`coverImageUrl` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `newsletterCampaignProducts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `newsletterCampaigns` ADD `templateType` enum('manual','latest','seasonal','selected') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `newsletterCampaigns` ADD `seasonLabel` varchar(120);--> statement-breakpoint
ALTER TABLE `newsletterCampaignProducts` ADD CONSTRAINT `newsletterCampaignProducts_campaignId_newsletterCampaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `newsletterCampaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `newsletterCampaignProducts` ADD CONSTRAINT `newsletterCampaignProducts_listingId_marketplaceListings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `marketplaceListings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `newsletter_campaign_products_campaign_idx` ON `newsletterCampaignProducts` (`campaignId`);--> statement-breakpoint
CREATE INDEX `newsletter_campaign_products_listing_idx` ON `newsletterCampaignProducts` (`listingId`);