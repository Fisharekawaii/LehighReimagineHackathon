import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
// TODO(DATA-01): Normalize trips/items/members when moving beyond the hackathon.
// Optimistic version checks protect concurrent edits in this small shared demo.
export const appState = sqliteTable("app_state", {
  id: text("id").primaryKey(),
  version: integer("version").notNull(),
  payload: text("payload").notNull(),
});
