ALTER TABLE `marketplaceListings` DROP INDEX `listings_shopify_product_unique`;--> statement-breakpoint
ALTER TABLE `marketplaceOrders` DROP INDEX `orders_shopify_order_unique`;--> statement-breakpoint
ALTER TABLE `marketplaceListings` ADD `description` text;--> statement-breakpoint
ALTER TABLE `marketplaceListings` ADD `priceAmount` varchar(40) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplaceListings` ADD `currencyCode` varchar(8) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplaceListings` ADD `coverImageUrl` text;--> statement-breakpoint
ALTER TABLE `marketplaceListings` ADD `licenseName` varchar(160);--> statement-breakpoint
ALTER TABLE `marketplaceListings` ADD `featured` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplaceListings` ADD CONSTRAINT `listings_external_product_unique` UNIQUE(`shopifyProductId`);--> statement-breakpoint
ALTER TABLE `marketplaceOrders` ADD CONSTRAINT `orders_payment_order_unique` UNIQUE(`shopifyOrderId`);