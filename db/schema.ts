import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const accountProgress = sqliteTable("account_progress", {
  owner: text("owner").primaryKey(),
  revision: integer("revision").notNull(),
  document: text("document").notNull(),
});

export const argumentAccounts = sqliteTable("argument_accounts", {
  owner: text("owner").primaryKey(),
  revision: integer("revision").notNull(),
  transactionId: text("transaction_id").notNull(),
});

export const argumentRecords = sqliteTable(
  "argument_records",
  {
    owner: text("owner").notNull(),
    id: text("id").notNull(),
    revision: integer("revision").notNull(),
    sheet: text("sheet").notNull(),
  },
  (table) => [primaryKey({ columns: [table.owner, table.id] })],
);

export const argumentReceipts = sqliteTable(
  "argument_receipts",
  {
    owner: text("owner").notNull(),
    operationId: text("operation_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    recordId: text("record_id").notNull(),
    revision: integer("revision").notNull(),
    kind: text("kind").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.owner, table.operationId] }),
    index("argument_receipt_expiry").on(table.owner, table.expiresAt),
  ],
);
