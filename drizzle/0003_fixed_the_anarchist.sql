ALTER TABLE `marketplaceOrders` ADD `receiptToken` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplaceOrders` ADD CONSTRAINT `orders_receipt_token_unique` UNIQUE(`receiptToken`);