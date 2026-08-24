CREATE TABLE `buyerWishlistItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerAccountId` int NOT NULL,
	`listingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `buyerWishlistItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `buyer_wishlist_account_listing_unique` UNIQUE(`buyerAccountId`,`listingId`)
);
--> statement-breakpoint
ALTER TABLE `buyerWishlistItems` ADD CONSTRAINT `buyerWishlistItems_buyerAccountId_buyerAccounts_id_fk` FOREIGN KEY (`buyerAccountId`) REFERENCES `buyerAccounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `buyerWishlistItems` ADD CONSTRAINT `buyerWishlistItems_listingId_marketplaceListings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `marketplaceListings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `buyer_wishlist_account_idx` ON `buyerWishlistItems` (`buyerAccountId`);--> statement-breakpoint
CREATE INDEX `buyer_wishlist_listing_idx` ON `buyerWishlistItems` (`listingId`);