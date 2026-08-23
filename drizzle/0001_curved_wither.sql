CREATE TABLE `buyerReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`buyerUserId` int,
	`orderItemId` int,
	`rating` int NOT NULL,
	`body` text,
	`status` enum('pending','published','hidden') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buyerReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `catalogCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`handle` varchar(120) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalogCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_handle_unique` UNIQUE(`handle`)
);
--> statement-breakpoint
CREATE TABLE `commissionPolicies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int,
	`commissionRateBasisPoints` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissionPolicies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `downloadGrants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderItemId` int NOT NULL,
	`assetId` int NOT NULL,
	`accessToken` varchar(128) NOT NULL,
	`downloadCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `downloadGrants_id` PRIMARY KEY(`id`),
	CONSTRAINT `download_grants_token_unique` UNIQUE(`accessToken`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceListings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`categoryId` int,
	`shopifyProductId` varchar(255) NOT NULL,
	`handle` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`productType` varchar(120),
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`isDigital` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplaceListings_id` PRIMARY KEY(`id`),
	CONSTRAINT `listings_shopify_product_unique` UNIQUE(`shopifyProductId`),
	CONSTRAINT `listings_handle_unique` UNIQUE(`handle`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceOrderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`listingId` int,
	`shopifyLineItemId` varchar(255),
	`title` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` varchar(40) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplaceOrderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopifyOrderId` varchar(255) NOT NULL,
	`buyerUserId` int,
	`buyerEmail` varchar(320),
	`currencyCode` varchar(8) NOT NULL,
	`totalAmount` varchar(40) NOT NULL,
	`status` enum('pending','paid','fulfilled','refunded','cancelled') NOT NULL DEFAULT 'pending',
	`purchasedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplaceOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_shopify_order_unique` UNIQUE(`shopifyOrderId`)
);
--> statement-breakpoint
CREATE TABLE `productAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`originalFilename` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sellers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int,
	`displayName` varchar(160) NOT NULL,
	`status` enum('active','invited','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sellers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`handle` varchar(120) NOT NULL,
	`description` text,
	`status` enum('active','draft','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shops_id` PRIMARY KEY(`id`),
	CONSTRAINT `shops_handle_unique` UNIQUE(`handle`)
);
--> statement-breakpoint
ALTER TABLE `buyerReviews` ADD CONSTRAINT `buyerReviews_listingId_marketplaceListings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `marketplaceListings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `buyerReviews` ADD CONSTRAINT `buyerReviews_buyerUserId_users_id_fk` FOREIGN KEY (`buyerUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `buyerReviews` ADD CONSTRAINT `buyerReviews_orderItemId_marketplaceOrderItems_id_fk` FOREIGN KEY (`orderItemId`) REFERENCES `marketplaceOrderItems`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commissionPolicies` ADD CONSTRAINT `commissionPolicies_shopId_shops_id_fk` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `downloadGrants` ADD CONSTRAINT `downloadGrants_orderItemId_marketplaceOrderItems_id_fk` FOREIGN KEY (`orderItemId`) REFERENCES `marketplaceOrderItems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `downloadGrants` ADD CONSTRAINT `downloadGrants_assetId_productAssets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `productAssets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplaceListings` ADD CONSTRAINT `marketplaceListings_shopId_shops_id_fk` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplaceListings` ADD CONSTRAINT `marketplaceListings_categoryId_catalogCategories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `catalogCategories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplaceOrderItems` ADD CONSTRAINT `marketplaceOrderItems_orderId_marketplaceOrders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `marketplaceOrders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplaceOrderItems` ADD CONSTRAINT `marketplaceOrderItems_listingId_marketplaceListings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `marketplaceListings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplaceOrders` ADD CONSTRAINT `marketplaceOrders_buyerUserId_users_id_fk` FOREIGN KEY (`buyerUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productAssets` ADD CONSTRAINT `productAssets_listingId_marketplaceListings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `marketplaceListings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sellers` ADD CONSTRAINT `sellers_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shops` ADD CONSTRAINT `shops_sellerId_sellers_id_fk` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reviews_listing_idx` ON `buyerReviews` (`listingId`);--> statement-breakpoint
CREATE INDEX `reviews_buyer_idx` ON `buyerReviews` (`buyerUserId`);--> statement-breakpoint
CREATE INDEX `download_grants_item_idx` ON `downloadGrants` (`orderItemId`);--> statement-breakpoint
CREATE INDEX `listings_shop_idx` ON `marketplaceListings` (`shopId`);--> statement-breakpoint
CREATE INDEX `listings_category_idx` ON `marketplaceListings` (`categoryId`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `marketplaceOrderItems` (`orderId`);--> statement-breakpoint
CREATE INDEX `order_items_listing_idx` ON `marketplaceOrderItems` (`listingId`);--> statement-breakpoint
CREATE INDEX `orders_buyer_idx` ON `marketplaceOrders` (`buyerUserId`);--> statement-breakpoint
CREATE INDEX `product_assets_listing_idx` ON `productAssets` (`listingId`);--> statement-breakpoint
CREATE INDEX `sellers_owner_idx` ON `sellers` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `shops_seller_idx` ON `shops` (`sellerId`);