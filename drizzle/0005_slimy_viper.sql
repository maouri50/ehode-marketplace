CREATE TABLE `newsletterSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` enum('active','unsubscribed') NOT NULL DEFAULT 'active',
	`consentedAt` timestamp NOT NULL DEFAULT (now()),
	`unsubscribedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `newsletterSubscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_subscriptions_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `newsletter_subscriptions_status_idx` ON `newsletterSubscriptions` (`status`);