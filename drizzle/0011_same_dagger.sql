CREATE TABLE `announcementBarMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message` varchar(220) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcementBarMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcementBarSettings` (
	`id` int NOT NULL,
	`backgroundColor` varchar(7) NOT NULL DEFAULT '#f1641e',
	`textColor` varchar(7) NOT NULL DEFAULT '#ffffff',
	`fontFamily` varchar(24) NOT NULL DEFAULT 'sans',
	`rotationSeconds` int NOT NULL DEFAULT 4,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcementBarSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `announcement_bar_messages_active_idx` ON `announcementBarMessages` (`isActive`);--> statement-breakpoint
CREATE INDEX `announcement_bar_messages_order_idx` ON `announcementBarMessages` (`sortOrder`);