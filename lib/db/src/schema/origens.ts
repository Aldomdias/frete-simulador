import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { transportadorasTable } from "./transportadoras";

export const origensTable = pgTable("origens", {
  id: serial("id").primaryKey(),
  transportadoraId: integer("transportadora_id").notNull().references(() => transportadorasTable.id, { onDelete: "cascade" }),
  canal: text("canal").notNull().default("B2C"),
  cidade: text("cidade").notNull(),
  uf: text("uf").notNull().default(""),
  icms: boolean("icms").notNull().default(false),
  icmsAliquota: real("icms_aliquota").notNull().default(0),
  adValorem: real("ad_valorem").notNull().default(0),
  adValoremMinimo: real("ad_valorem_minimo").notNull().default(0),
  pedagio: real("pedagio").notNull().default(0),
  grisPercentual: real("gris_percentual").notNull().default(0),
  grisMinimo: real("gris_minimo").notNull().default(0),
  tas: real("tas").notNull().default(0),
  ctrcEmitido: real("ctrc_emitido").notNull().default(0),
  cubagem: real("cubagem").notNull().default(300),
  faixaDePeso: boolean("faixa_de_peso").notNull().default(false),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrigemSchema = createInsertSchema(origensTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrigem = z.infer<typeof insertOrigemSchema>;
export type Origem = typeof origensTable.$inferSelect;
