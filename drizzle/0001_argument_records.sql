CREATE TABLE `argument_accounts` (
	`owner` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`transaction_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `argument_receipts` (
	`owner` text NOT NULL,
	`operation_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`record_id` text NOT NULL,
	`revision` integer NOT NULL,
	`kind` text NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`owner`, `operation_id`)
);
--> statement-breakpoint
CREATE INDEX `argument_receipt_expiry` ON `argument_receipts` (`owner`,`expires_at`);--> statement-breakpoint
CREATE TABLE `argument_records` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`revision` integer NOT NULL,
	`sheet` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
