import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transportadorasTable = pgTable("transportadoras", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTransportadoraSchema = createInsertSchema(transportadorasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransportadora = z.infer<typeof insertTransportadoraSchema>;
export type Transportadora = typeof transportadorasTable.$inferSelect;
