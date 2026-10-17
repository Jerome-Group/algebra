CREATE TABLE `account_progress` (
	`owner` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`document` text NOT NULL
);
