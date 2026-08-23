ALTER TABLE `marketplaceOrders` ADD `deliveryEmailStatus` varchar(24) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplaceOrders` ADD `deliveryEmailMessageId` varchar(255);--> statement-breakpoint
ALTER TABLE `marketplaceOrders` ADD `deliveryEmailSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `marketplaceOrders` ADD `deliveryEmailError` text;