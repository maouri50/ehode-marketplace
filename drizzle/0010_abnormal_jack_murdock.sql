CREATE TABLE `buyerPasswordResetTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerAccountId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `buyerPasswordResetTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `buyer_password_reset_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `buyerPasswordResetTokens` ADD CONSTRAINT `buyerPasswordResetTokens_buyerAccountId_buyerAccounts_id_fk` FOREIGN KEY (`buyerAccountId`) REFERENCES `buyerAccounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `buyer_password_reset_account_idx` ON `buyerPasswordResetTokens` (`buyerAccountId`);--> statement-breakpoint
CREATE INDEX `buyer_password_reset_expiry_idx` ON `buyerPasswordResetTokens` (`expiresAt`);