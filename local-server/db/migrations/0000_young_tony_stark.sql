CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`event_date` text NOT NULL,
	`location` text NOT NULL,
	`organizer` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pedagog_data` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`school` text NOT NULL,
	`pinfl` text,
	`birth_date` text,
	`category` text DEFAULT 'Mutaxassis' NOT NULL,
	`lesson_hours` integer DEFAULT 0 NOT NULL,
	`certificate_name` text,
	`certificate_issue_date` text,
	`certificate_expiry_date` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pedagog_data_pinfl_unique` ON `pedagog_data` (`pinfl`);--> statement-breakpoint
CREATE TABLE `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`url` text NOT NULL,
	`author_name` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`school` text NOT NULL,
	`subject` text NOT NULL,
	`bio` text,
	`email` text,
	`phone` text,
	`avatar_color` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
