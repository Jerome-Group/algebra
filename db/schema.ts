import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accountProgress = sqliteTable("account_progress", {
  owner: text("owner").primaryKey(),
  revision: integer("revision").notNull(),
  document: text("document").notNull(),
});
