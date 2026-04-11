import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { origensTable } from "./origens";

export const taxasEspeciaisTable = pgTable("taxas_especiais", {
  id: serial("id").primaryKey(),
  origemId: integer("origem_id").notNull().references(() => origensTable.id, { onDelete: "cascade" }),
  ibgeDestino: text("ibge_destino").notNull(),
  trt: real("trt").notNull().default(0),
  tda: real("tda").notNull().default(0),
  suframa: real("suframa").notNull().default(0),
  outras: real("outras").notNull().default(0),
  // Overrides for Generalidades — null = use Generalidades value
  grisPercentual: real("gris_percentual"),
  grisMinimo: real("gris_minimo"),
  adValorem: real("ad_valorem"),
  adValoremMinimo: real("ad_valorem_minimo"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaxaEspecialSchema = createInsertSchema(taxasEspeciaisTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaxaEspecial = z.infer<typeof insertTaxaEspecialSchema>;
export type TaxaEspecial = typeof taxasEspeciaisTable.$inferSelect;
