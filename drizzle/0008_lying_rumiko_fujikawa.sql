CREATE TABLE `buyerAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buyerAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `buyer_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `buyerSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerAccountId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `buyerSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `buyer_sessions_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `contactMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerAccountId` int,
	`name` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`subject` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`status` enum('new','read','archived') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contactMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `buyerReviews` ADD `buyerAccountId` int;--> statement-breakpoint
ALTER TABLE `marketplaceOrders` ADD `buyerAccountId` int;--> statement-breakpoint
ALTER TABLE `buyerReviews` ADD CONSTRAINT `reviews_order_item_unique` UNIQUE(`orderItemId`);--> statement-breakpoint
ALTER TABLE `buyerSessions` ADD CONSTRAINT `buyerSessions_buyerAccountId_buyerAccounts_id_fk` FOREIGN KEY (`buyerAccountId`) REFERENCES `buyerAccounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contactMessages` ADD CONSTRAINT `contactMessages_buyerAccountId_buyerAccounts_id_fk` FOREIGN KEY (`buyerAccountId`) REFERENCES `buyerAccounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `buyer_sessions_account_idx` ON `buyerSessions` (`buyerAccountId`);--> statement-breakpoint
CREATE INDEX `buyer_sessions_expiry_idx` ON `buyerSessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `contact_messages_status_idx` ON `contactMessages` (`status`);--> statement-breakpoint
CREATE INDEX `contact_messages_created_idx` ON `contactMessages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `contact_messages_account_idx` ON `contactMessages` (`buyerAccountId`);--> statement-breakpoint
ALTER TABLE `buyerReviews` ADD CONSTRAINT `buyerReviews_buyerAccountId_buyerAccounts_id_fk` FOREIGN KEY (`buyerAccountId`) REFERENCES `buyerAccounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplaceOrders` ADD CONSTRAINT `marketplaceOrders_buyerAccountId_buyerAccounts_id_fk` FOREIGN KEY (`buyerAccountId`) REFERENCES `buyerAccounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reviews_buyer_account_idx` ON `buyerReviews` (`buyerAccountId`);--> statement-breakpoint
CREATE INDEX `reviews_status_idx` ON `buyerReviews` (`status`);--> statement-breakpoint
CREATE INDEX `orders_buyer_account_idx` ON `marketplaceOrders` (`buyerAccountId`);