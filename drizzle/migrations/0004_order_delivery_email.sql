ALTER TABLE `marketplaceOrders`
  ADD COLUMN `deliveryEmailStatus` varchar(24) NOT NULL DEFAULT 'pending',
  ADD COLUMN `deliveryEmailMessageId` varchar(255),
  ADD COLUMN `deliveryEmailSentAt` timestamp NULL,
  ADD COLUMN `deliveryEmailError` text;
