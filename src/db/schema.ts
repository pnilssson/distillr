import { sql } from "drizzle-orm";
import {
  index,
  pgPolicy,
  pgRole,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const authenticatedRole = pgRole("authenticated").existing();

export const libraries = pgTable(
  "libraries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("libraries_user_id_idx").on(table.userId),
    uniqueIndex("libraries_user_id_name_idx").on(table.userId, table.name),
    pgPolicy("libraries_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
    pgPolicy("libraries_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("libraries_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("libraries_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
  ],
).enableRLS();

export type Library = typeof libraries.$inferSelect;
